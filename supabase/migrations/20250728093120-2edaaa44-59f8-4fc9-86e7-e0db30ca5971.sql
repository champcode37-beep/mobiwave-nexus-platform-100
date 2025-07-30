-- Complete database type migration fixes

-- Ensure ussd_sessions table exists
CREATE TABLE IF NOT EXISTS public.ussd_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id character varying NOT NULL,
  application_id uuid NOT NULL,
  phone_number character varying NOT NULL,
  current_node_id character varying NOT NULL,
  input_path text[] DEFAULT '{}',
  navigation_path character varying[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status character varying DEFAULT 'active'
);

-- Ensure mspace_ussd_applications table exists
CREATE TABLE IF NOT EXISTS public.mspace_ussd_applications (
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

-- Add missing columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS data_model_id uuid;

-- Enable RLS on new tables
ALTER TABLE public.ussd_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mspace_ussd_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own ussd sessions" ON public.ussd_sessions;
DROP POLICY IF EXISTS "System can manage ussd sessions" ON public.ussd_sessions;
DROP POLICY IF EXISTS "Users can manage their own ussd applications" ON public.mspace_ussd_applications;

-- Create RLS policies for ussd_sessions
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

-- Create RLS policies for mspace_ussd_applications
CREATE POLICY "Users can manage their own ussd applications" 
ON public.mspace_ussd_applications 
FOR ALL 
USING (auth.uid() = user_id);

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_ussd_sessions_updated_at ON public.ussd_sessions;
DROP TRIGGER IF EXISTS update_mspace_ussd_applications_updated_at ON public.mspace_ussd_applications;

CREATE TRIGGER update_ussd_sessions_updated_at
BEFORE UPDATE ON public.ussd_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mspace_ussd_applications_updated_at
BEFORE UPDATE ON public.mspace_ussd_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();