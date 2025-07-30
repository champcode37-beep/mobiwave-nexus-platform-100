import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface AdminProfileRequest {
  action: 'get' | 'update' | 'updateAvatar' | 'updateSecurity' | 'updatePreferences' | 'getAuditLog';
  profileData?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company?: string;
    department?: string;
    job_title?: string;
    bio?: string;
  };
  securityData?: {
    two_factor_enabled?: boolean;
    session_timeout?: number;
    ip_whitelist?: string[];
    password_change_required?: boolean;
  };
  preferences?: {
    theme?: string;
    timezone?: string;
    date_format?: string;
    time_format?: string;
    email_notifications?: boolean;
    sms_notifications?: boolean;
    system_alerts?: boolean;
    security_alerts?: boolean;
    performance_alerts?: boolean;
    backup_notifications?: boolean;
    user_activity_alerts?: boolean;
    maintenance_notifications?: boolean;
  };
  avatarData?: {
    avatar_url?: string;
    avatar_file_name?: string;
  };
}

interface SupabaseClient {
  from: (table: string) => any;
  auth: {
    getUser: () => Promise<{ data: { user: any } }>;
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

    const requestBody: AdminProfileRequest = await req.json();
    const { action } = requestBody;

    switch (action) {
      case 'get':
        return await getAdminProfile(user.id, supabaseClient);
      
      case 'update':
        return await updateAdminProfile(user.id, requestBody.profileData!, supabaseClient, supabaseAdmin);
      
      case 'updateAvatar':
        return await updateAdminAvatar(user.id, requestBody.avatarData!, supabaseClient, supabaseAdmin);
      
      case 'updateSecurity':
        return await updateAdminSecurity(user.id, requestBody.securityData!, supabaseClient, supabaseAdmin);
      
      case 'updatePreferences':
        return await updateAdminPreferences(user.id, requestBody.preferences!, supabaseClient, supabaseAdmin);
      
      case 'getAuditLog':
        return await getAdminProfileAuditLog(user.id, supabaseClient);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Admin profile management error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getAdminProfile(userId: string, supabase: any) {
  try {
    // Get main profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Get admin profile data
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get admin security settings
    const { data: securitySettings, error: securityError } = await supabase
      .from('admin_security_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get admin preferences
    const { data: preferences, error: preferencesError } = await supabase
      .from('admin_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Combine all data
    const combinedData = {
      ...profileData,
      ...adminProfile,
      admin_security_settings: securitySettings,
      admin_preferences: preferences
    };

    return new Response(
      JSON.stringify({ data: combinedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get admin profile: ${errorMessage}`);
  }
}

async function updateAdminProfile(userId: string, profileData: any, supabase: any, supabaseAdmin: any) {
  try {
    // Update main profile
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: profileData.email,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (profileError) throw profileError;

    // Update or insert admin-specific profile data
    const { error: adminProfileError } = await supabase
      .from('admin_profiles')
      .upsert({
        user_id: userId,
        phone: profileData.phone,
        company: profileData.company,
        department: profileData.department,
        job_title: profileData.job_title,
        bio: profileData.bio,
        updated_at: new Date().toISOString()
      });

    if (adminProfileError) throw adminProfileError;

    // Log the profile update
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'ADMIN_PROFILE_UPDATE',
      resource: `admin_profile/${userId}`,
      data: {
        updated_fields: Object.keys(profileData),
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ data: updatedProfile, message: 'Admin profile updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to update admin profile: ${errorMessage}`);
  }
}

async function updateAdminAvatar(userId: string, avatarData: any, supabase: any, supabaseAdmin: any) {
  try {
    const { error: avatarError } = await supabase
      .from('admin_profiles')
      .upsert({
        user_id: userId,
        avatar_url: avatarData.avatar_url,
        avatar_file_name: avatarData.avatar_file_name,
        updated_at: new Date().toISOString()
      });

    if (avatarError) throw avatarError;

    // Log the avatar update
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'ADMIN_AVATAR_UPDATE',
      resource: `admin_profile/${userId}`,
      data: {
        avatar_url: avatarData.avatar_url,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ message: 'Admin avatar updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to update admin avatar: ${errorMessage}`);
  }
}

async function updateAdminSecurity(userId: string, securityData: any, supabase: any, supabaseAdmin: any) {
  try {
    const { error: securityError } = await supabase
      .from('admin_security_settings')
      .upsert({
        user_id: userId,
        two_factor_enabled: securityData.two_factor_enabled,
        session_timeout: securityData.session_timeout,
        ip_whitelist: securityData.ip_whitelist,
        password_change_required: securityData.password_change_required,
        updated_at: new Date().toISOString()
      });

    if (securityError) throw securityError;

    // Log the security update
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'ADMIN_SECURITY_UPDATE',
      resource: `admin_security/${userId}`,
      data: {
        updated_settings: Object.keys(securityData),
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ message: 'Admin security settings updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to update admin security settings: ${errorMessage}`);
  }
}

async function updateAdminPreferences(userId: string, preferences: any, supabase: any, supabaseAdmin: any) {
  try {
    const { error: preferencesError } = await supabase
      .from('admin_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      });

    if (preferencesError) throw preferencesError;

    // Log the preferences update
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'ADMIN_PREFERENCES_UPDATE',
      resource: `admin_preferences/${userId}`,
      data: {
        updated_preferences: Object.keys(preferences),
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ message: 'Admin preferences updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to update admin preferences: ${errorMessage}`);
  }
}

async function getAdminProfileAuditLog(userId: string, supabase: any) {
  try {
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .in('action', [
        'ADMIN_PROFILE_UPDATE',
        'ADMIN_AVATAR_UPDATE',
        'ADMIN_SECURITY_UPDATE',
        'ADMIN_PREFERENCES_UPDATE'
      ])
      .order('timestamp', { ascending: false })
      .limit(50);

    if (auditError) throw auditError;

    return new Response(
      JSON.stringify({ data: auditLogs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get admin profile audit log: ${errorMessage}`);
  }
}