import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

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

    if (req.method === 'POST') {
      return await handleAvatarUpload(req, user.id, supabaseClient, supabaseAdmin);
    } else if (req.method === 'DELETE') {
      return await handleAvatarDelete(user.id, supabaseClient, supabaseAdmin);
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin avatar upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleAvatarUpload(req: Request, userId: string, supabase: any, supabaseAdmin: any) {
  try {
    const formData = await req.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Only JPEG, PNG, and GIF are allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 5MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `admin-avatar-${userId}-${Date.now()}.${fileExt}`;
    const filePath = `admin-avatars/${fileName}`;

    // Convert file to ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    // Delete old avatar if exists
    const { data: oldProfile } = await supabase
      .from('admin_profiles')
      .select('avatar_url, avatar_file_name')
      .eq('user_id', userId)
      .single();

    if (oldProfile?.avatar_file_name) {
      // Delete old file from storage (don't fail if this fails)
      await supabase.storage
        .from('avatars')
        .remove([`admin-avatars/${oldProfile.avatar_file_name}`])
        .catch(console.warn);
    }

    // Update admin profile with new avatar
    const { error: updateError } = await supabase
      .from('admin_profiles')
      .upsert({
        user_id: userId,
        avatar_url: urlData.publicUrl,
        avatar_file_name: fileName,
        updated_at: new Date().toISOString()
      });

    if (updateError) {
      // If database update fails, clean up uploaded file
      await supabase.storage
        .from('avatars')
        .remove([filePath])
        .catch(console.warn);
      
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    // Log the avatar upload
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'ADMIN_AVATAR_UPLOAD',
      resource: `admin_profile/${userId}`,
      data: {
        file_name: fileName,
        file_size: file.size,
        file_type: file.type,
        avatar_url: urlData.publicUrl,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        message: 'Avatar uploaded successfully',
        data: {
          avatar_url: urlData.publicUrl,
          file_name: fileName
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Avatar upload failed: ${errorMessage}`);
  }
}

async function handleAvatarDelete(userId: string, supabase: any, supabaseAdmin: any) {
  try {
    // Get current avatar info
    const { data: currentProfile } = await supabase
      .from('admin_profiles')
      .select('avatar_url, avatar_file_name')
      .eq('user_id', userId)
      .single();

    if (!currentProfile?.avatar_file_name) {
      return new Response(
        JSON.stringify({ error: 'No avatar to delete' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete file from storage
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([`admin-avatars/${currentProfile.avatar_file_name}`]);

    if (deleteError) {
      console.warn('Failed to delete file from storage:', deleteError);
    }

    // Update admin profile to remove avatar
    const { error: updateError } = await supabase
      .from('admin_profiles')
      .update({
        avatar_url: null,
        avatar_file_name: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    // Log the avatar deletion
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'ADMIN_AVATAR_DELETE',
      resource: `admin_profile/${userId}`,
      data: {
        deleted_file: currentProfile.avatar_file_name,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ message: 'Avatar deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Avatar deletion failed: ${errorMessage}`);
  }
}