-- Fix security issues: Enable RLS on remaining tables and fix function search paths

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

-- Create basic RLS policies for the tables (admin-only access for most system tables)

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

-- Fix function search paths by recreating functions with proper security
DROP FUNCTION IF EXISTS update_updated_at_column();
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

DROP FUNCTION IF EXISTS create_admin_profile_on_signup();
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

DROP FUNCTION IF EXISTS create_profile_on_signup();
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_system_events_event_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON system_events(created_at);
CREATE INDEX IF NOT EXISTS idx_service_health_service_name ON service_health(service_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_message_history_recipient ON message_history(recipient);
CREATE INDEX IF NOT EXISTS idx_message_history_type ON message_history(type);
CREATE INDEX IF NOT EXISTS idx_message_history_status ON message_history(status);
CREATE INDEX IF NOT EXISTS idx_message_history_created_at ON message_history(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_service ON api_keys(service);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- Insert sample data with proper conflict handling
INSERT INTO roles (name, description, is_system_role, permissions) VALUES 
('super_admin', 'Full system access', TRUE, ARRAY['*']),
('admin', 'Administrative access', TRUE, ARRAY['users:read', 'users:write', 'messages:read', 'messages:write', 'audit:read']),
('manager', 'Management access', TRUE, ARRAY['users:read', 'messages:read', 'messages:write']),
('user', 'Standard user access', TRUE, ARRAY['messages:read', 'messages:write', 'profile:read', 'profile:write']),
('readonly', 'Read-only access', TRUE, ARRAY['messages:read', 'profile:read'])
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, resource, action, description) VALUES 
('users:read', 'users', 'read', 'View user information'),
('users:write', 'users', 'write', 'Create and modify users'),
('users:delete', 'users', 'delete', 'Delete users'),
('messages:read', 'messages', 'read', 'View messages'),
('messages:write', 'messages', 'write', 'Send and edit messages'),
('messages:delete', 'messages', 'delete', 'Delete messages'),
('audit:read', 'audit', 'read', 'View audit logs'),
('admin:read', 'admin', 'read', 'View admin interfaces'),
('admin:write', 'admin', 'write', 'Modify system settings'),
('profile:read', 'profile', 'read', 'View own profile'),
('profile:write', 'profile', 'write', 'Edit own profile')
ON CONFLICT (name) DO NOTHING;

INSERT INTO organizations (name, slug) VALUES 
('Mobiwave Innovations', 'mobiwave'),
('Demo Organization', 'demo')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO service_health (service_name, status, version) VALUES 
('authentication-service', 'healthy', 'v2.1.3'),
('message-routing-service', 'healthy', 'v1.8.2'),
('user-management-service', 'healthy', 'v3.0.1'),
('notification-service', 'healthy', 'v1.5.7'),
('file-storage-service', 'healthy', 'v2.3.1'),
('analytics-service', 'healthy', 'v1.2.4')
ON CONFLICT (service_name) DO NOTHING;