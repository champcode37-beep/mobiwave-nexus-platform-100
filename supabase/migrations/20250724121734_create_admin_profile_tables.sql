-- Create admin profile management tables
-- This script creates the necessary tables for admin profile management

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

-- Create indexes for better performance
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

-- Create RLS policies
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

-- Create trigger for automatic admin profile creation
CREATE TRIGGER on_admin_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_admin_profile_on_signup();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON admin_profiles TO authenticated;
GRANT ALL ON admin_security_settings TO authenticated;
GRANT ALL ON admin_preferences TO authenticated;
GRANT ALL ON admin_api_keys TO authenticated;
GRANT ALL ON admin_sessions TO authenticated;
GRANT ALL ON admin_profile_audit_log TO authenticated;