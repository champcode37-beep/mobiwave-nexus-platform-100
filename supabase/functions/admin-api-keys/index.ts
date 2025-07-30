import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface ApiKeyRequest {
  action: 'list' | 'create' | 'update' | 'delete' | 'regenerate';
  keyId?: string;
  keyData?: {
    name: string;
    permissions: string[];
    expires_at?: string;
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

    const requestBody: ApiKeyRequest = await req.json();
    const { action } = requestBody;

    switch (action) {
      case 'list':
        return await listApiKeys(user.id, supabaseClient);
      
      case 'create':
        return await createApiKey(user.id, requestBody.keyData!, supabaseClient, supabaseAdmin);
      
      case 'update':
        return await updateApiKey(user.id, requestBody.keyId!, requestBody.keyData!, supabaseClient, supabaseAdmin);
      
      case 'delete':
        return await deleteApiKey(user.id, requestBody.keyId!, supabaseClient, supabaseAdmin);
      
      case 'regenerate':
        return await regenerateApiKey(user.id, requestBody.keyId!, supabaseClient, supabaseAdmin);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Admin API keys error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return 'admin_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function listApiKeys(userId: string, supabase: SupabaseClient) {
  try {
    const { data: apiKeys, error } = await supabase
      .from('admin_api_keys')
      .select(`
        id,
        key_name,
        api_key_preview,
        permissions,
        status,
        last_used,
        expires_at,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return new Response(
      JSON.stringify({ data: apiKeys }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to list API keys: ${errorMessage}`);
  }
}

async function createApiKey(userId: string, keyData: { name: string; permissions: string[]; expires_at?: string }, supabase: SupabaseClient, supabaseAdmin: SupabaseClient) {
  try {
    // Validate permissions
    const validPermissions = ['read', 'write', 'admin', 'monitor', 'analytics'];
    const permissions = keyData.permissions.filter((p: string) => validPermissions.includes(p));
    
    if (permissions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one valid permission is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate API key
    const apiKey = generateApiKey();
    const apiKeyHash = await hashApiKey(apiKey);
    const apiKeyPreview = apiKey.substring(0, 12) + '...';

    // Set expiration date (default 1 year if not provided)
    const expiresAt = keyData.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    // Insert into database
    const { data: newApiKey, error: insertError } = await supabase
      .from('admin_api_keys')
      .insert({
        user_id: userId,
        key_name: keyData.name,
        api_key_hash: apiKeyHash,
        api_key_preview: apiKeyPreview,
        permissions: permissions,
        expires_at: expiresAt,
        status: 'active'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log the API key creation
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'ADMIN_API_KEY_CREATE',
      resource: `admin_api_key/${newApiKey.id}`,
      data: {
        key_name: keyData.name,
        permissions: permissions,
        expires_at: expiresAt,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        message: 'API key created successfully',
        data: {
          ...newApiKey,
          api_key: apiKey // Only return the full key on creation
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to create API key: ${errorMessage}`);
  }
}

async function updateApiKey(userId: string, keyId: string, keyData: { name?: string; permissions?: string[]; expires_at?: string }, supabase: SupabaseClient, supabaseAdmin: SupabaseClient) {
  try {
    // Validate permissions if provided
    let permissions = keyData.permissions;
    if (permissions) {
      const validPermissions = ['read', 'write', 'admin', 'monitor', 'analytics'];
      permissions = permissions.filter((p: string) => validPermissions.includes(p));
      
      if (permissions.length === 0) {
        return new Response(
          JSON.stringify({ error: 'At least one valid permission is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update API key
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (keyData.name) updateData.key_name = keyData.name;
    if (permissions) updateData.permissions = permissions;
    if (keyData.expires_at) updateData.expires_at = keyData.expires_at;

    const { data: updatedApiKey, error: updateError } = await supabase
      .from('admin_api_keys')
      .update(updateData)
      .eq('id', keyId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log the API key update
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'ADMIN_API_KEY_UPDATE',
      resource: `admin_api_key/${keyId}`,
      data: {
        updated_fields: Object.keys(updateData),
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        message: 'API key updated successfully',
        data: updatedApiKey
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to update API key: ${errorMessage}`);
  }
}

async function deleteApiKey(userId: string, keyId: string, supabase: SupabaseClient, supabaseAdmin: SupabaseClient) {
  try {
    // Get key info before deletion for logging
    const { data: keyInfo } = await supabase
      .from('admin_api_keys')
      .select('key_name')
      .eq('id', keyId)
      .eq('user_id', userId)
      .single();

    // Delete API key
    const { error: deleteError } = await supabase
      .from('admin_api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    // Log the API key deletion
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'ADMIN_API_KEY_DELETE',
      resource: `admin_api_key/${keyId}`,
      data: {
        key_name: keyInfo?.key_name || 'Unknown',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ message: 'API key deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to delete API key: ${errorMessage}`);
  }
}

async function regenerateApiKey(userId: string, keyId: string, supabase: SupabaseClient, supabaseAdmin: SupabaseClient) {
  try {
    // Generate new API key
    const newApiKey = generateApiKey();
    const newApiKeyHash = await hashApiKey(newApiKey);
    const newApiKeyPreview = newApiKey.substring(0, 12) + '...';

    // Update the API key in database
    const { data: updatedApiKey, error: updateError } = await supabase
      .from('admin_api_keys')
      .update({
        api_key_hash: newApiKeyHash,
        api_key_preview: newApiKeyPreview,
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log the API key regeneration
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'ADMIN_API_KEY_REGENERATE',
      resource: `admin_api_key/${keyId}`,
      data: {
        key_name: updatedApiKey.key_name,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        message: 'API key regenerated successfully',
        data: {
          ...updatedApiKey,
          api_key: newApiKey // Return the new key
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to regenerate API key: ${errorMessage}`);
  }
}