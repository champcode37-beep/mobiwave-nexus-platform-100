-- Fix foreign key constraints in security_events and audit_logs tables
-- These should not reference auth.users directly as it's managed by Supabase

-- Drop existing foreign key constraints if they exist
ALTER TABLE security_events DROP CONSTRAINT IF EXISTS security_events_user_id_fkey;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- Remove user_id column constraints - keep as UUID for logging but don't enforce FK
-- The user_id will just be a reference without foreign key constraint

-- Create missing tables that are being queried by the frontend

-- Create user_credits table
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_type character varying NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_credits
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_credits
CREATE POLICY "Users can manage their own credits" 
ON public.user_credits 
FOR ALL 
USING (auth.uid() = user_id);

-- Create user_service_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_service_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_catalog_id UUID NOT NULL,
  status character varying NOT NULL DEFAULT 'active',
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_service_subscriptions
ALTER TABLE public.user_service_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_service_subscriptions
CREATE POLICY "Users can manage their own subscriptions" 
ON public.user_service_subscriptions 
FOR ALL 
USING (auth.uid() = user_id);

-- Add foreign key relationship between user_service_subscriptions and services_catalog
ALTER TABLE public.user_service_subscriptions 
ADD CONSTRAINT user_service_subscriptions_service_catalog_id_fkey 
FOREIGN KEY (service_catalog_id) REFERENCES public.services_catalog(id) ON DELETE CASCADE;

-- Fix service_activation_requests to reference services_catalog properly
-- Add foreign key constraint if it doesn't exist
ALTER TABLE public.service_activation_requests 
ADD CONSTRAINT service_activation_requests_service_id_fkey 
FOREIGN KEY (service_id) REFERENCES public.services_catalog(id) ON DELETE CASCADE;

-- Add updated_at triggers for new tables
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_service_subscriptions_updated_at
  BEFORE UPDATE ON public.user_service_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data for testing

-- Insert sample user credits
INSERT INTO public.user_credits (user_id, service_type, credits) 
VALUES 
  ('d10e2a2e-7d61-40c6-8f1b-c2b928538bae', 'sms', 100),
  ('d10e2a2e-7d61-40c6-8f1b-c2b928538bae', 'email', 500)
ON CONFLICT DO NOTHING;

-- Insert sample service subscriptions
INSERT INTO public.user_service_subscriptions (user_id, service_catalog_id, status)
SELECT 
  'd10e2a2e-7d61-40c6-8f1b-c2b928538bae',
  sc.id,
  'active'
FROM public.services_catalog sc
WHERE sc.service_type IN ('sms', 'email')
ON CONFLICT DO NOTHING;