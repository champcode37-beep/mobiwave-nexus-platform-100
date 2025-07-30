-- Create missing tables that the application expects

-- Create api_credentials table (used by ApiCredentials component)
CREATE TABLE IF NOT EXISTS public.api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  username VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, service_name)
);

-- Enable RLS on api_credentials
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for api_credentials
CREATE POLICY "Users can manage their own credentials" ON public.api_credentials
FOR ALL USING (auth.uid() = user_id);

-- Create campaigns table (used by Analytics component)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  sender_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'draft',
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for campaigns
CREATE POLICY "Users can manage their own campaigns" ON public.campaigns
FOR ALL USING (auth.uid() = user_id);

-- Create contacts table (used in various components)
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, phone)
);

-- Enable RLS on contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for contacts
CREATE POLICY "Users can manage their own contacts" ON public.contacts
FOR ALL USING (auth.uid() = user_id);

-- Create user_credits table (used in various components)
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  credits_balance INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, service_type)
);

-- Enable RLS on user_credits
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Create policies for user_credits
CREATE POLICY "Users can view their own credits" ON public.user_credits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage user credits" ON public.user_credits
FOR ALL USING (auth.role() = 'service_role');

-- Create services_catalog table (used in service activation components)
CREATE TABLE IF NOT EXISTS public.services_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(255) NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  pricing JSONB DEFAULT '{}',
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(service_type)
);

-- Enable RLS on services_catalog
ALTER TABLE public.services_catalog ENABLE ROW LEVEL SECURITY;

-- Create policies for services_catalog
CREATE POLICY "Anyone can view active services" ON public.services_catalog
FOR SELECT USING (is_active = true);

-- Create user_service_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_service_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service_id UUID REFERENCES public.services_catalog(id),
  status VARCHAR(50) DEFAULT 'active',
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, service_id)
);

-- Enable RLS on user_service_subscriptions
ALTER TABLE public.user_service_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_service_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.user_service_subscriptions
FOR SELECT USING (auth.uid() = user_id);

-- Insert some default services
INSERT INTO public.services_catalog (service_name, service_type, description, is_active) VALUES
('SMS Service', 'sms', 'Bulk SMS messaging service', true),
('Email Service', 'email', 'Bulk email marketing service', true),
('USSD Service', 'ussd', 'USSD application service', true),
('M-Pesa Integration', 'mpesa', 'Mobile payment integration', true)
ON CONFLICT (service_type) DO NOTHING;

-- Create activity_logs table (used by AuditLogViewer)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for activity_logs
CREATE POLICY "Users can view their own activity logs" ON public.activity_logs
FOR SELECT USING (auth.uid() = user_id OR public.user_has_permission(auth.uid(), 'system_settings'));

CREATE POLICY "System can insert activity logs" ON public.activity_logs
FOR INSERT WITH CHECK (true);

-- Create system_audit_logs table (used by EnhancedAuditViewer)
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR(255) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on system_audit_logs
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for system_audit_logs
CREATE POLICY "Users can view audit logs" ON public.system_audit_logs
FOR SELECT USING (auth.uid() = user_id OR public.user_has_permission(auth.uid(), 'system_settings'));

CREATE POLICY "System can insert audit logs" ON public.system_audit_logs
FOR INSERT WITH CHECK (true);

-- Add foreign key references where appropriate
ALTER TABLE public.api_credentials
ADD CONSTRAINT fk_api_credentials_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.campaigns
ADD CONSTRAINT fk_campaigns_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.contacts
ADD CONSTRAINT fk_contacts_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_credits
ADD CONSTRAINT fk_user_credits_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_service_subscriptions
ADD CONSTRAINT fk_user_service_subscriptions_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables that need them
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_api_credentials_updated_at') THEN
        CREATE TRIGGER update_api_credentials_updated_at
            BEFORE UPDATE ON public.api_credentials
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_campaigns_updated_at') THEN
        CREATE TRIGGER update_campaigns_updated_at
            BEFORE UPDATE ON public.campaigns
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contacts_updated_at') THEN
        CREATE TRIGGER update_contacts_updated_at
            BEFORE UPDATE ON public.contacts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_services_catalog_updated_at') THEN
        CREATE TRIGGER update_services_catalog_updated_at
            BEFORE UPDATE ON public.services_catalog
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_service_subscriptions_updated_at') THEN
        CREATE TRIGGER update_user_service_subscriptions_updated_at
            BEFORE UPDATE ON public.user_service_subscriptions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;