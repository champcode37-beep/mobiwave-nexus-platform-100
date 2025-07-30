-- Fix missing RLS policies for key tables

-- Policies for channels table
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public channels"
ON public.channels
FOR SELECT
USING (type = 'public' OR created_by = auth.uid());

CREATE POLICY "Users can manage their own channels"
ON public.channels
FOR ALL
USING (created_by = auth.uid());

-- Policies for files table  
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own files"
ON public.files
FOR SELECT
USING (uploaded_by = auth.uid());

CREATE POLICY "Users can manage their own files"
ON public.files
FOR ALL
USING (uploaded_by = auth.uid());

-- Policies for messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their channels"
ON public.messages
FOR SELECT
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.channels 
    WHERE channels.id = messages.channel_id 
    AND (channels.created_by = auth.uid() OR channels.type = 'public')
  )
);

CREATE POLICY "Users can create messages"
ON public.messages
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policies for notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Policies for organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations are viewable by all authenticated users"
ON public.organizations
FOR SELECT
TO authenticated
USING (true);

-- Policies for permissions table
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permissions are viewable by authenticated users"
ON public.permissions
FOR SELECT
TO authenticated
USING (true);

-- Policies for role_permissions table
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role permissions are viewable by authenticated users"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);

-- Policies for roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles are viewable by authenticated users"
ON public.roles
FOR SELECT
TO authenticated
USING (true);

-- Fix function search path
CREATE OR REPLACE FUNCTION public.user_has_permission(user_uuid uuid, permission_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON r.name = COALESCE(p.role, 'user')
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions perm ON perm.id = rp.permission_id
    WHERE p.id = user_uuid 
    AND perm.name = permission_name
  );
$function$;

-- Create missing user_roles table if not exists
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
    granted_by uuid REFERENCES auth.users(id),
    granted_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role_id)
);

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles table
CREATE POLICY "Users can view role assignments"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage role assignments"
ON public.user_roles
FOR ALL
USING (user_has_permission(auth.uid(), 'manage_roles'));

-- Insert some basic roles if they don't exist
INSERT INTO public.roles (name, description, is_system_role) 
VALUES 
  ('admin', 'Administrator with full access', true),
  ('user', 'Regular user', true),
  ('super_admin', 'Super administrator', true)
ON CONFLICT (name) DO NOTHING;

-- Insert basic permissions if they don't exist
INSERT INTO public.permissions (name, resource, action, description)
VALUES 
  ('manage_users', 'users', 'manage', 'Can manage user accounts'),
  ('manage_roles', 'roles', 'manage', 'Can manage user roles'),
  ('system_settings', 'system', 'manage', 'Can access system settings')
ON CONFLICT (name) DO NOTHING;

-- Create missing service subscriptions table for proper user management
CREATE TABLE IF NOT EXISTS public.user_service_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    service_id uuid REFERENCES public.services_catalog(id) ON DELETE CASCADE NOT NULL,
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'cancelled')),
    subscribed_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, service_id)
);

-- Enable RLS on user_service_subscriptions
ALTER TABLE public.user_service_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own service subscriptions"
ON public.user_service_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own service subscriptions"
ON public.user_service_subscriptions
FOR ALL
USING (auth.uid() = user_id);