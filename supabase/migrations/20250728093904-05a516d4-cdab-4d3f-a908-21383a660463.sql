-- Final comprehensive migration to fix all remaining database issues

-- Add missing columns to existing tables
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.contact_groups ADD COLUMN IF NOT EXISTS contact_count integer DEFAULT 0;

-- Create sms_templates table
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  content text NOT NULL,
  category character varying DEFAULT 'general',
  variables text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create workflows table (if not exists)
CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  shortcode character varying,
  flow_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Recreate USSD tables with proper structure
DROP TABLE IF EXISTS public.ussd_sessions CASCADE;
DROP TABLE IF EXISTS public.mspace_ussd_applications CASCADE;

CREATE TABLE public.mspace_ussd_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  service_code character varying NOT NULL,
  menu_structure jsonb DEFAULT '[]',
  callback_url text,
  status character varying DEFAULT 'draft',
  subscription_id character varying,
  mspace_application_id character varying,
  setup_fee numeric DEFAULT 0,
  monthly_fee numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.ussd_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id character varying NOT NULL,
  application_id uuid NOT NULL REFERENCES public.mspace_ussd_applications(id),
  phone_number character varying NOT NULL,
  current_node_id character varying NOT NULL,
  input_path text[] DEFAULT '{}',
  navigation_path character varying[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status character varying DEFAULT 'active'
);

-- Enable RLS on all tables
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ussd_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mspace_ussd_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own sms templates" 
ON public.sms_templates 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own workflows" 
ON public.workflows 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own ussd sessions" 
ON public.ussd_sessions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.mspace_ussd_applications 
  WHERE mspace_ussd_applications.id = ussd_sessions.application_id 
  AND mspace_ussd_applications.user_id = auth.uid()
));

CREATE POLICY "System can manage ussd sessions" 
ON public.ussd_sessions 
FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Users can manage their own ussd applications" 
ON public.mspace_ussd_applications 
FOR ALL 
USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_sms_templates_updated_at
BEFORE UPDATE ON public.sms_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ussd_sessions_updated_at
BEFORE UPDATE ON public.ussd_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mspace_ussd_applications_updated_at
BEFORE UPDATE ON public.mspace_ussd_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();