-- Mobiwave Innovations Database Schema
-- Microservices-ready database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication service
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Teams/Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User organization memberships
CREATE TABLE user_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Channels for messaging service
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'public', -- public, private, direct
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages for messaging service
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- text, file, system
    metadata JSONB DEFAULT '{}',
    parent_message_id UUID REFERENCES messages(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File storage metadata
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    storage_path VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications for notification service
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    content TEXT,
    metadata JSONB DEFAULT '{}',
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System events for analytics service
CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Microservice health checks
CREATE TABLE service_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL, -- healthy, warning, error
    version VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions TEXT[] DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table  
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    UNIQUE(role_id, permission_id)
);

-- User roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, role_id)
);

-- Enhanced audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table for SMS/Email history
CREATE TABLE IF NOT EXISTS message_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('sms', 'email', 'push', 'in_app')),
    recipient VARCHAR(255) NOT NULL,
    sender VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    provider VARCHAR(50), -- twilio, sendgrid, etc.
    provider_message_id VARCHAR(255),
    cost DECIMAL(10,4),
    retry_count INTEGER DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    recipient_count INTEGER DEFAULT 1,
    delivered_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API keys table (encrypted storage)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    encrypted_key TEXT NOT NULL,
    key_hash VARCHAR(255) NOT NULL, -- For validation without decryption
    service VARCHAR(100) NOT NULL,
    environment VARCHAR(20) DEFAULT 'production',
    is_active BOOLEAN DEFAULT TRUE,
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security events table
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    details JSONB DEFAULT '{}',
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PLANS TABLE
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC
);

-- SERVICES TABLE
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

-- Profiles table (referencing auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USER PLAN SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS user_plan_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  plan_id INTEGER REFERENCES plans(id),
  status TEXT DEFAULT 'active',
  subscribed_at TIMESTAMP DEFAULT NOW()
);

-- SERVICE ACTIVATION REQUESTS
CREATE TABLE IF NOT EXISTS service_activation_requests (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  service_id INTEGER REFERENCES services(id),
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  admin_id UUID REFERENCES profiles(id)
);

-- Admin profiles table
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  phone VARCHAR(20),
  company VARCHAR(255),
  department VARCHAR(255),
  job_title VARCHAR(255),
  bio TEXT,
  avatar_url TEXT,
  avatar_file_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin security settings table
CREATE TABLE IF NOT EXISTS admin_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  two_factor_enabled BOOLEAN DEFAULT false,
  session_timeout INTEGER DEFAULT 3600, -- in seconds
  ip_whitelist TEXT[],
  last_login TIMESTAMP WITH TIME ZONE,
  login_attempts INTEGER DEFAULT 0,
  password_change_required BOOLEAN DEFAULT false,
  password_last_changed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin preferences table
CREATE TABLE IF NOT EXISTS admin_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  theme VARCHAR(20) DEFAULT 'light',
  timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  time_format VARCHAR(10) DEFAULT '24h',
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT true,
  system_alerts BOOLEAN DEFAULT true,
  security_alerts BOOLEAN DEFAULT true,
  performance_alerts BOOLEAN DEFAULT true,
  backup_notifications BOOLEAN DEFAULT true,
  user_activity_alerts BOOLEAN DEFAULT false,
  maintenance_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin API keys table
CREATE TABLE IF NOT EXISTS admin_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name VARCHAR(255) NOT NULL,
  api_key_hash TEXT NOT NULL,
  api_key_preview VARCHAR(50) NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['read'],
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
  last_used TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  location JSONB,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Admin profile audit log table
CREATE TABLE IF NOT EXISTS admin_profile_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_system_events_event_type ON system_events(event_type);
CREATE INDEX idx_system_events_created_at ON system_events(created_at);
CREATE INDEX idx_service_health_service_name ON service_health(service_name);

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

CREATE INDEX IF NOT EXISTS idx_user_plan_subs_user ON user_plan_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_service_activation_user ON service_activation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_activation_status ON service_activation_requests(status);

CREATE INDEX IF NOT EXISTS idx_admin_profiles_user_id ON admin_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_security_settings_user_id ON admin_security_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_preferences_user_id ON admin_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_api_keys_user_id ON admin_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_api_keys_status ON admin_api_keys(status);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_is_active ON admin_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_profile_audit_log_user_id ON admin_profile_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_profile_audit_log_created_at ON admin_profile_audit_log(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profile_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plan_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_activation_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin profiles policies
CREATE POLICY "Users can view their own admin profile" ON admin_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own admin profile" ON admin_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own admin profile" ON admin_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin security settings policies
CREATE POLICY "Users can view their own security settings" ON admin_security_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own security settings" ON admin_security_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own security settings" ON admin_security_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin preferences policies
CREATE POLICY "Users can view their own preferences" ON admin_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON admin_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON admin_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin API keys policies
CREATE POLICY "Users can view their own API keys" ON admin_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own API keys" ON admin_api_keys
  FOR ALL USING (auth.uid() = user_id);

-- Admin sessions policies
CREATE POLICY "Users can view their own sessions" ON admin_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" ON admin_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Admin audit log policies
CREATE POLICY "Users can view their own audit logs" ON admin_profile_audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" ON admin_profile_audit_log
  FOR INSERT WITH CHECK (true);

-- User plan subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON user_plan_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subscriptions" ON user_plan_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Service activation requests policies
CREATE POLICY "Users can view their own requests" ON service_activation_requests
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = admin_id);

CREATE POLICY "Users can create their own requests" ON service_activation_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update requests" ON service_activation_requests
  FOR UPDATE USING (auth.uid() = admin_id);

-- Update existing users table to add security fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Insert default roles and permissions
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

-- Insert sample data
INSERT INTO organizations (name, slug) VALUES 
('Mobiwave Innovations', 'mobiwave'),
('Demo Organization', 'demo')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES 
('admin@mobiwave.com', '$2b$10$sample_hash_here', 'Admin', 'User', 'admin'),
('alice@mobiwave.com', '$2b$10$sample_hash_here', 'Alice', 'Johnson', 'user'),
('bob@mobiwave.com', '$2b$10$sample_hash_here', 'Bob', 'Chen', 'user')
ON CONFLICT (email) DO NOTHING;

INSERT INTO channels (organization_id, name, description, created_by) 
SELECT o.id, 'general', 'General team communication', u.id 
FROM organizations o, users u 
WHERE o.slug = 'mobiwave' AND u.email = 'admin@mobiwave.com'
ON CONFLICT DO NOTHING;

INSERT INTO service_health (service_name, status, version) VALUES 
('authentication-service', 'healthy', 'v2.1.3'),
('message-routing-service', 'healthy', 'v1.8.2'),
('user-management-service', 'healthy', 'v3.0.1'),
('notification-service', 'healthy', 'v1.5.7'),
('file-storage-service', 'healthy', 'v2.3.1'),
('analytics-service', 'healthy', 'v1.2.4')
ON CONFLICT (service_name) DO NOTHING;

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
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

-- Create function to automatically create admin profile on user creation
CREATE OR REPLACE FUNCTION create_admin_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create admin profile for users with admin role
  IF NEW.raw_user_meta_data->>'role' IN ('admin', 'super_admin') THEN
    INSERT INTO admin_profiles (user_id, role)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'admin'));
    
    INSERT INTO admin_security_settings (user_id)
    VALUES (NEW.id);
    
    INSERT INTO admin_preferences (user_id)
    VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to automatically create profile on user creation
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic profile creation
CREATE TRIGGER on_admin_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_admin_profile_on_signup();

CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_on_signup();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON admin_profiles TO authenticated;
GRANT ALL ON admin_security_settings TO authenticated;
GRANT ALL ON admin_preferences TO authenticated;
GRANT ALL ON admin_api_keys TO authenticated;
GRANT ALL ON admin_sessions TO authenticated;
GRANT ALL ON admin_profile_audit_log TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON user_plan_subscriptions TO authenticated;
GRANT ALL ON service_activation_requests TO authenticated;