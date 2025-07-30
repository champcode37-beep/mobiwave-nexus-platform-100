-- Add role column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Add user_type column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'demo';

-- Add email column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Add full_name column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name text;

-- Insert the three major roles (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'super_admin') THEN
    INSERT INTO public.roles (name, description, is_system_role) VALUES
    ('super_admin', 'Super Administrator with full system access', true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'admin') THEN
    INSERT INTO public.roles (name, description, is_system_role) VALUES
    ('admin', 'Administrator with elevated privileges', true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'user') THEN
    INSERT INTO public.roles (name, description, is_system_role) VALUES
    ('user', 'Standard user with basic access', true);
  END IF;
END $$;

-- Insert basic permissions (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'user_management') THEN
    INSERT INTO public.permissions (name, action, resource, description) VALUES
    ('user_management', 'manage', 'users', 'Manage user accounts and profiles');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'user_read') THEN
    INSERT INTO public.permissions (name, action, resource, description) VALUES
    ('user_read', 'read', 'users', 'View user information');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'system_settings') THEN
    INSERT INTO public.permissions (name, action, resource, description) VALUES
    ('system_settings', 'manage', 'system', 'Configure system settings');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'dashboard_access') THEN
    INSERT INTO public.permissions (name, action, resource, description) VALUES
    ('dashboard_access', 'access', 'dashboard', 'Access user dashboard');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'admin_dashboard_access') THEN
    INSERT INTO public.permissions (name, action, resource, description) VALUES
    ('admin_dashboard_access', 'access', 'admin_dashboard', 'Access admin dashboard');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'super_admin_dashboard_access') THEN
    INSERT INTO public.permissions (name, action, resource, description) VALUES
    ('super_admin_dashboard_access', 'access', 'super_admin_dashboard', 'Access super admin dashboard');
  END IF;
END $$;

-- Link roles to permissions
DO $$ 
DECLARE
  super_admin_role_id uuid;
  admin_role_id uuid;
  user_role_id uuid;
  perm_id uuid;
BEGIN
  -- Get role IDs
  SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'super_admin';
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
  SELECT id INTO user_role_id FROM public.roles WHERE name = 'user';
  
  -- Super admin gets all permissions
  FOR perm_id IN SELECT id FROM public.permissions LOOP
    IF NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role_id = super_admin_role_id AND permission_id = perm_id) THEN
      INSERT INTO public.role_permissions (role_id, permission_id) VALUES (super_admin_role_id, perm_id);
    END IF;
  END LOOP;
  
  -- Admin gets specific permissions
  FOR perm_id IN SELECT id FROM public.permissions WHERE name IN ('user_management', 'user_read', 'admin_dashboard_access', 'dashboard_access') LOOP
    IF NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role_id = admin_role_id AND permission_id = perm_id) THEN
      INSERT INTO public.role_permissions (role_id, permission_id) VALUES (admin_role_id, perm_id);
    END IF;
  END LOOP;
  
  -- User gets basic permissions
  FOR perm_id IN SELECT id FROM public.permissions WHERE name IN ('user_read', 'dashboard_access') LOOP
    IF NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role_id = user_role_id AND permission_id = perm_id) THEN
      INSERT INTO public.role_permissions (role_id, permission_id) VALUES (user_role_id, perm_id);
    END IF;
  END LOOP;
END $$;

-- Update the get_user_role function to work with profiles table
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(role, 'user') 
  FROM public.profiles 
  WHERE id = user_uuid;
$$;

-- Create function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(user_uuid uuid, permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON r.name = COALESCE(p.role, 'user')
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions perm ON perm.id = rp.permission_id
    WHERE p.id = user_uuid 
    AND perm.name = permission_name
  );
$$;