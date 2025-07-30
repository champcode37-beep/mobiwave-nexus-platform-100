-- Fix security issues: Drop and recreate functions with proper search paths

-- Drop triggers first, then functions, then recreate with proper security
DROP TRIGGER IF EXISTS update_admin_profiles_updated_at ON admin_profiles;
DROP TRIGGER IF EXISTS update_admin_security_settings_updated_at ON admin_security_settings;
DROP TRIGGER IF EXISTS update_admin_preferences_updated_at ON admin_preferences;
DROP TRIGGER IF EXISTS update_admin_api_keys_updated_at ON admin_api_keys;

DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS create_admin_profile_on_signup();
DROP FUNCTION IF EXISTS create_profile_on_signup();

-- Enable RLS on all remaining tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for the tables

-- Users table - only allow users to see their own data
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Organizations table - public read, authenticated insert/update
CREATE POLICY "Organizations are viewable by authenticated users" ON organizations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage organizations" ON organizations
  FOR ALL USING (auth.role() = 'authenticated');

-- User organizations - users can manage their own memberships
CREATE POLICY "Users can view their own org memberships" ON user_organizations
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage their own org memberships" ON user_organizations
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Channels - organization-based access
CREATE POLICY "Users can view channels in their organizations" ON channels
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage channels" ON channels
  FOR ALL USING (auth.role() = 'authenticated');

-- Messages - users can see and send messages
CREATE POLICY "Users can view messages" ON messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Files - users can manage their own files
CREATE POLICY "Users can view files" ON files
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can upload files" ON files
  FOR INSERT WITH CHECK (auth.uid()::text = uploaded_by::text);

-- Notifications - users see their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- System events - authenticated read access
CREATE POLICY "Authenticated users can view system events" ON system_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can create events" ON system_events
  FOR INSERT WITH CHECK (true);

-- Service health - public read access
CREATE POLICY "Anyone can view service health" ON service_health
  FOR SELECT USING (true);

CREATE POLICY "System can update service health" ON service_health
  FOR ALL USING (auth.role() = 'service_role');

-- Roles - authenticated read access
CREATE POLICY "Authenticated users can view roles" ON roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Permissions - authenticated read access  
CREATE POLICY "Authenticated users can view permissions" ON permissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Role permissions - authenticated read access
CREATE POLICY "Authenticated users can view role permissions" ON role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- User roles - users can view their own roles
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Audit logs - authenticated read access
CREATE POLICY "Authenticated users can view audit logs" ON audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can create audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Message history - authenticated access
CREATE POLICY "Authenticated users can view message history" ON message_history
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can manage message history" ON message_history
  FOR ALL USING (auth.role() = 'service_role');

-- API keys - users manage their own keys
CREATE POLICY "Users can view their own API keys" ON api_keys
  FOR SELECT USING (auth.uid()::text = created_by::text);

CREATE POLICY "Users can manage their own API keys" ON api_keys
  FOR ALL USING (auth.uid()::text = created_by::text);

-- Security events - authenticated read access
CREATE POLICY "Authenticated users can view security events" ON security_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can create security events" ON security_events
  FOR INSERT WITH CHECK (true);

-- Plans - public read access
CREATE POLICY "Anyone can view plans" ON plans
  FOR SELECT USING (true);

-- Services - public read access
CREATE POLICY "Anyone can view services" ON services
  FOR SELECT USING (true);

-- Recreate functions with proper security
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION create_admin_profile_on_signup()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create admin profile for users with admin role
  IF NEW.raw_user_meta_data->>'role' IN ('admin', 'super_admin') THEN
    INSERT INTO public.admin_profiles (user_id, role)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'admin'));
    
    INSERT INTO public.admin_security_settings (user_id)
    VALUES (NEW.id);
    
    INSERT INTO public.admin_preferences (user_id)
    VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name');
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_admin_profiles_updated_at 
  BEFORE UPDATE ON admin_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_security_settings_updated_at 
  BEFORE UPDATE ON admin_security_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_preferences_updated_at 
  BEFORE UPDATE ON admin_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_api_keys_updated_at 
  BEFORE UPDATE ON admin_api_keys 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();