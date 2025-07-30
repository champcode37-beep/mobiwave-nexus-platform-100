import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface SessionRequest {
  action: 'list' | 'create' | 'terminate' | 'terminateAll' | 'updateActivity' | 'getSecurityLog';
  sessionId?: string;
  sessionData?: {
    ip_address?: string;
    user_agent?: string;
    location?: any;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody: SessionRequest = await req.json();
    const { action } = requestBody;

    switch (action) {
      case 'list':
        return await listAdminSessions(user.id, supabaseClient);
      
      case 'create':
        return await createAdminSession(user.id, requestBody.sessionData!, req, supabaseClient, supabaseAdmin);
      
      case 'terminate':
        return await terminateAdminSession(user.id, requestBody.sessionId!, supabaseClient, supabaseAdmin);
      
      case 'terminateAll':
        return await terminateAllAdminSessions(user.id, supabaseClient, supabaseAdmin);
      
      case 'updateActivity':
        return await updateSessionActivity(user.id, requestBody.sessionId!, supabaseClient);
      
      case 'getSecurityLog':
        return await getAdminSecurityLog(user.id, supabaseClient);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Admin session management error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateSessionToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function listAdminSessions(userId: string, supabase: any) {
  try {
    const { data: sessions, error } = await supabase
      .from('admin_sessions')
      .select(`
        id,
        session_token,
        ip_address,
        user_agent,
        location,
        is_active,
        last_activity,
        created_at,
        expires_at
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_activity', { ascending: false });

    if (error) throw error;

    // Don't return full session tokens for security
    const safeSessions = sessions.map((session: any) => ({
      ...session,
      session_token: session.session_token.substring(0, 8) + '...'
    }));

    return new Response(
      JSON.stringify({ data: safeSessions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to list admin sessions: ${errorMessage}`);
  }
}

async function createAdminSession(userId: string, sessionData: any, req: Request, supabase: any, supabaseAdmin: any) {
  try {
    // Generate session token
    const sessionToken = await generateSessionToken();
    
    // Get client IP and user agent
    const clientIp = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Get session timeout from admin security settings
    const { data: securitySettings } = await supabase
      .from('admin_security_settings')
      .select('session_timeout')
      .eq('user_id', userId)
      .single();

    const sessionTimeout = securitySettings?.session_timeout || 3600; // Default 1 hour
    const expiresAt = new Date(Date.now() + sessionTimeout * 1000).toISOString();

    // Create session record
    const { data: newSession, error: insertError } = await supabase
      .from('admin_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        ip_address: clientIp,
        user_agent: userAgent,
        location: sessionData.location || null,
        expires_at: expiresAt,
        is_active: true
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Update last login in security settings
    await supabase
      .from('admin_security_settings')
      .upsert({
        user_id: userId,
        last_login: new Date().toISOString(),
        login_attempts: 0,
        updated_at: new Date().toISOString()
      });

    // Log the session creation
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'ADMIN_SESSION_CREATE',
      resource: `admin_session/${newSession.id}`,
      data: {
        ip_address: clientIp,
        user_agent: userAgent,
        expires_at: expiresAt,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        message: 'Admin session created successfully',
        data: {
          session_id: newSession.id,
          session_token: sessionToken,
          expires_at: expiresAt
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to create admin session: ${errorMessage}`);
  }
}

async function terminateAdminSession(userId: string, sessionId: string, supabase: any, supabaseAdmin: any) {
  try {
    // Get session info before termination
    const { data: sessionInfo } = await supabase
      .from('admin_sessions')
      .select('ip_address, user_agent')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    // Terminate session
    const { error: updateError } = await supabase
      .from('admin_sessions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // Log the session termination
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'ADMIN_SESSION_TERMINATE',
      resource: `admin_session/${sessionId}`,
      data: {
        ip_address: sessionInfo?.ip_address,
        user_agent: sessionInfo?.user_agent,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ message: 'Admin session terminated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to terminate admin session: ${errorMessage}`);
  }
}

async function terminateAllAdminSessions(userId: string, supabase: any, supabaseAdmin: any) {
  try {
    // Get count of active sessions
    const { count } = await supabase
      .from('admin_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Terminate all active sessions
    const { error: updateError } = await supabase
      .from('admin_sessions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (updateError) throw updateError;

    // Log the mass session termination
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'ADMIN_SESSION_TERMINATE_ALL',
      resource: `admin_sessions/${userId}`,
      data: {
        terminated_count: count || 0,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        message: 'All admin sessions terminated successfully',
        terminated_count: count || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to terminate all admin sessions: ${errorMessage}`);
  }
}

async function updateSessionActivity(userId: string, sessionId: string, supabase: any) {
  try {
    // Update last activity timestamp
    const { error: updateError } = await supabase
      .from('admin_sessions')
      .update({
        last_activity: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ message: 'Session activity updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to update session activity: ${errorMessage}`);
  }
}

async function getAdminSecurityLog(userId: string, supabase: any) {
  try {
    // Get recent security-related audit logs
    const { data: securityLogs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .in('action', [
        'ADMIN_SESSION_CREATE',
        'ADMIN_SESSION_TERMINATE',
        'ADMIN_SESSION_TERMINATE_ALL',
        'ADMIN_SECURITY_UPDATE',
        'ADMIN_PASSWORD_CHANGE',
        'ADMIN_2FA_ENABLE',
        'ADMIN_2FA_DISABLE'
      ])
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Get current security settings
    const { data: securitySettings } = await supabase
      .from('admin_security_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get active sessions count
    const { count: activeSessions } = await supabase
      .from('admin_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    return new Response(
      JSON.stringify({
        data: {
          security_logs: securityLogs,
          security_settings: securitySettings,
          active_sessions_count: activeSessions || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get admin security log: ${errorMessage}`);
  }
}