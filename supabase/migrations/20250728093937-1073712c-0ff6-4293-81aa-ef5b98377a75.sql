-- Drop conflicting policies first, then add missing tables
DROP POLICY IF EXISTS "Users can manage their own workflows" ON public.workflows;

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

-- Enable RLS on sms_templates if created
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for sms_templates
DROP POLICY IF EXISTS "Users can manage their own sms templates" ON public.sms_templates;
CREATE POLICY "Users can manage their own sms templates" 
ON public.sms_templates 
FOR ALL 
USING (auth.uid() = user_id);

-- Add updated_at trigger for sms_templates
DROP TRIGGER IF EXISTS update_sms_templates_updated_at ON public.sms_templates;
CREATE TRIGGER update_sms_templates_updated_at
BEFORE UPDATE ON public.sms_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();