-- Create missing tables referenced in components

-- Contact group related tables
CREATE TABLE IF NOT EXISTS public.contact_groups (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name character varying NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_group_members (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Scheduled campaigns table
CREATE TABLE IF NOT EXISTS public.scheduled_campaigns (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid NOT NULL,
    user_id uuid NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    status character varying DEFAULT 'scheduled',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Mspace Pesa integrations table
CREATE TABLE IF NOT EXISTS public.mspace_pesa_integrations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    business_shortcode character varying,
    consumer_key character varying,
    consumer_secret character varying,
    passkey character varying,
    callback_url text,
    environment character varying DEFAULT 'sandbox',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Data models table for data hub
CREATE TABLE IF NOT EXISTS public.data_models (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name character varying NOT NULL,
    description text,
    schema jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mspace_pesa_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_models ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own contact groups" 
ON public.contact_groups 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own contact group members" 
ON public.contact_group_members 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.contact_groups 
    WHERE id = contact_group_members.group_id 
    AND user_id = auth.uid()
));

CREATE POLICY "Users can manage their own scheduled campaigns" 
ON public.scheduled_campaigns 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own mspace integrations" 
ON public.mspace_pesa_integrations 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own data models" 
ON public.data_models 
FOR ALL 
USING (auth.uid() = user_id);

-- Add foreign key constraints
ALTER TABLE public.contact_group_members 
ADD CONSTRAINT fk_contact_group_members_group_id 
FOREIGN KEY (group_id) REFERENCES public.contact_groups(id) ON DELETE CASCADE;

ALTER TABLE public.contact_group_members 
ADD CONSTRAINT fk_contact_group_members_contact_id 
FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

ALTER TABLE public.scheduled_campaigns 
ADD CONSTRAINT fk_scheduled_campaigns_campaign_id 
FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;

-- Add updated_at triggers
CREATE TRIGGER update_contact_groups_updated_at
    BEFORE UPDATE ON public.contact_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_campaigns_updated_at
    BEFORE UPDATE ON public.scheduled_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mspace_pesa_integrations_updated_at
    BEFORE UPDATE ON public.mspace_pesa_integrations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_models_updated_at
    BEFORE UPDATE ON public.data_models
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add missing columns to services_catalog for UserServicesCatalog component
ALTER TABLE services_catalog ADD COLUMN IF NOT EXISTS transaction_fee_type character varying DEFAULT 'percentage';
ALTER TABLE services_catalog ADD COLUMN IF NOT EXISTS transaction_fee_amount numeric DEFAULT 0;
ALTER TABLE services_catalog ADD COLUMN IF NOT EXISTS provider character varying DEFAULT 'mspace';

-- Add severity and status columns to system_audit_logs for ServiceActivityLog component
ALTER TABLE system_audit_logs ADD COLUMN IF NOT EXISTS severity character varying DEFAULT 'low';
ALTER TABLE system_audit_logs ADD COLUMN IF NOT EXISTS status character varying DEFAULT 'success';