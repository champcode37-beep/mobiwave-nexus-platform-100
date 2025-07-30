-- Fix all database security issues by dropping all triggers and functions first

-- Drop all triggers from auth.users table
DROP TRIGGER IF EXISTS on_admin_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON auth.users;

-- Drop all other triggers
DROP TRIGGER IF EXISTS update_admin_profiles_updated_at ON admin_profiles;
DROP TRIGGER IF EXISTS update_admin_security_settings_updated_at ON admin_security_settings;
DROP TRIGGER IF EXISTS update_admin_preferences_updated_at ON admin_preferences;
DROP TRIGGER IF EXISTS update_admin_api_keys_updated_at ON admin_api_keys;

-- Now drop the functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS create_admin_profile_on_signup();
DROP FUNCTION IF EXISTS create_profile_on_signup();

-- Enable RLS on all remaining tables that don't have it
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

-- Create basic RLS policies for the tables (only if they don't exist)

-- Users table policies
DO $$ BEGIN
  CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Service health policies
DO $$ BEGIN
  CREATE POLICY "Anyone can view service health" ON service_health
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "System can update service health" ON service_health
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Message history policies
DO $$ BEGIN
  CREATE POLICY "Authenticated users can view message history" ON message_history
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "System can manage message history" ON message_history
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Plans and services policies
DO $$ BEGIN
  CREATE POLICY "Anyone can view plans" ON plans
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can view services" ON services
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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

-- Recreate auth triggers
CREATE TRIGGER on_admin_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_admin_profile_on_signup();

CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_on_signup();