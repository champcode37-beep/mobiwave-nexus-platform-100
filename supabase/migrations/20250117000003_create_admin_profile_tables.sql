-- Create admin profile management tables
-- This migration creates tables for comprehensive admin profile management

-- Admin profiles table for extended admin information
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20),
    company VARCHAR(255),
    department VARCHAR(255),
    job_title VARCHAR(255),
    bio TEXT,
    avatar_url TEXT,
    avatar_file_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Admin security settings table
CREATE TABLE IF NOT EXISTS public.admin_security_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    session_timeout INTEGER DEFAULT 3600, -- in seconds
    ip_whitelist TEXT[], -- array of allowed IP addresses
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    password_change_required BOOLEAN DEFAULT FALSE,
    password_last_changed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Admin preferences table
CREATE TABLE IF NOT EXISTS public.admin_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    time_format VARCHAR(10) DEFAULT '24h',
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT TRUE,
    system_alerts BOOLEAN DEFAULT TRUE,
    security_alerts BOOLEAN DEFAULT TRUE,
    performance_alerts BOOLEAN DEFAULT TRUE,
    backup_notifications BOOLEAN DEFAULT TRUE,
    user_activity_alerts BOOLEAN DEFAULT FALSE,
    maintenance_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Admin API keys table for managing admin-specific API keys
CREATE TABLE IF NOT EXISTS public.admin_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL,
    api_key_hash TEXT NOT NULL, -- hashed version of the API key
    api_key_preview VARCHAR(20), -- first few characters for display
    permissions TEXT[] DEFAULT ARRAY['read'], -- array of permissions
    status VARCHAR(20) DEFAULT 'active',
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin session tracking table
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    location JSONB, -- store location data if available
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_profiles_user_id ON public.admin_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_security_settings_user_id ON public.admin_security_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_preferences_user_id ON public.admin_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_api_keys_user_id ON public.admin_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_api_keys_status ON public.admin_api_keys(status);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON public.admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON public.admin_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON public.admin_sessions(expires_at);

-- Create RLS policies for admin profile tables
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Admin profiles policies
CREATE POLICY "Admin can view own profile" ON public.admin_profiles
    FOR SELECT USING (
        auth.uid() = user_id AND 
        EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Admin can update own profile" ON public.admin_profiles
    FOR ALL USING (
        auth.uid() = user_id AND 
        EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Admin security settings policies
CREATE POLICY "Admin can view own security settings" ON public.admin_security_settings
    FOR SELECT USING (
        auth.uid() = user_id AND 
        EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Admin can update own security settings" ON public.admin_security_settings
    FOR ALL USING (
        auth.uid() = user_id AND 
        EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Admin preferences policies
CREATE POLICY "Admin can view own preferences" ON public.admin_preferences
    FOR SELECT USING (
        auth.uid() = user_id AND 
        EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Admin can update own preferences" ON public.admin_preferences
    FOR ALL USING (
        auth.uid() = user_id AND 
        EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Admin API keys policies
CREATE POLICY "Admin can manage own API keys" ON public.admin_api_keys
    FOR ALL USING (
        auth.uid() = user_id AND 
        EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Admin sessions policies
CREATE POLICY "Admin can view own sessions" ON public.admin_sessions
    FOR SELECT USING (
        auth.uid() = user_id AND 
        EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Admin can manage own sessions" ON public.admin_sessions
    FOR ALL USING (
        auth.uid() = user_id AND 
        EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Super admin can view all admin data
CREATE POLICY "Super admin can view all admin profiles" ON public.admin_profiles
    FOR SELECT USING (
        EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Super admin can view all admin security settings" ON public.admin_security_settings
    FOR SELECT USING (
        EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Super admin can view all admin sessions" ON public.admin_sessions
    FOR SELECT USING (
        EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Function to automatically create admin profile data when a user becomes admin
CREATE OR REPLACE FUNCTION public.create_admin_profile_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create admin profile data if the user has admin or super_admin role
    IF NEW.role IN ('admin', 'super_admin') THEN
        -- Create admin profile
        INSERT INTO public.admin_profiles (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Create admin security settings with defaults
        INSERT INTO public.admin_security_settings (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Create admin preferences with defaults
        INSERT INTO public.admin_preferences (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create admin profile data when profile is created or role is updated
CREATE OR REPLACE TRIGGER create_admin_profile_data_trigger
    AFTER INSERT OR UPDATE OF role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_admin_profile_data();

-- Function to clean up expired admin sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_admin_sessions()
RETURNS void AS $$
BEGIN
    UPDATE public.admin_sessions 
    SET is_active = FALSE 
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    -- Delete sessions older than 30 days
    DELETE FROM public.admin_sessions 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up expired sessions (if pg_cron is available)
-- This would need to be run manually or via a cron job if pg_cron is not available
-- SELECT cron.schedule('cleanup-admin-sessions', '0 2 * * *', 'SELECT public.cleanup_expired_admin_sessions();');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.admin_profiles TO authenticated;
GRANT ALL ON public.admin_security_settings TO authenticated;
GRANT ALL ON public.admin_preferences TO authenticated;
GRANT ALL ON public.admin_api_keys TO authenticated;
GRANT ALL ON public.admin_sessions TO authenticated;