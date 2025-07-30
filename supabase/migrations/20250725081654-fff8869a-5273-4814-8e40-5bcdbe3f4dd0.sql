-- Insert the three major roles
INSERT INTO public.roles (name, description, is_system_role) VALUES
('super_admin', 'Super Administrator with full system access', true),
('admin', 'Administrator with elevated privileges', true),
('user', 'Standard user with basic access', true);

-- Insert basic permissions
INSERT INTO public.permissions (name, action, resource, description) VALUES
('user_management', 'manage', 'users', 'Manage user accounts and profiles'),
('user_read', 'read', 'users', 'View user information'),
('system_settings', 'manage', 'system', 'Configure system settings'),
('dashboard_access', 'access', 'dashboard', 'Access user dashboard'),
('admin_dashboard_access', 'access', 'admin_dashboard', 'Access admin dashboard'),
('super_admin_dashboard_access', 'access', 'super_admin_dashboard', 'Access super admin dashboard');

-- Link roles to permissions
WITH role_permission_mapping AS (
  SELECT 
    r.id as role_id,
    p.id as permission_id
  FROM public.roles r
  CROSS JOIN public.permissions p
  WHERE 
    -- Super admin gets all permissions
    (r.name = 'super_admin') OR
    -- Admin gets user management, user read, admin dashboard access
    (r.name = 'admin' AND p.name IN ('user_management', 'user_read', 'admin_dashboard_access', 'dashboard_access')) OR
    -- User gets basic permissions
    (r.name = 'user' AND p.name IN ('user_read', 'dashboard_access'))
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role_id, permission_id FROM role_permission_mapping;

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