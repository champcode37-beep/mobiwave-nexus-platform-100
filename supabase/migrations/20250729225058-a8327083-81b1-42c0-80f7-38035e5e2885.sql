-- Fix foreign key constraints in security_events and audit_logs tables
-- These should not reference auth.users directly as it's managed by Supabase

-- Drop existing foreign key constraints if they exist
ALTER TABLE security_events DROP CONSTRAINT IF EXISTS security_events_user_id_fkey;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

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
  service_id UUID NOT NULL,
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
ADD CONSTRAINT user_service_subscriptions_service_id_fkey 
FOREIGN KEY (service_id) REFERENCES public.services_catalog(id) ON DELETE CASCADE;

-- Check if service_activation_requests has the correct foreign key reference
-- First check the structure of service_activation_requests table
DO $$
BEGIN
    -- Add foreign key constraint if it doesn't exist and the column references an integer
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'service_activation_requests_service_id_fkey'
    ) THEN
        -- Check if service_id column exists and what it references
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'service_activation_requests' 
            AND column_name = 'service_id'
            AND data_type = 'integer'
        ) THEN
            -- It references the old services table (integer ID), we need to change this
            RAISE NOTICE 'service_activation_requests.service_id references integer, need to update schema';
        END IF;
    END IF;
END $$;

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
INSERT INTO public.user_credits (user_id, service_type, credits) 
VALUES 
  ('d10e2a2e-7d61-40c6-8f1b-c2b928538bae', 'sms', 100),
  ('d10e2a2e-7d61-40c6-8f1b-c2b928538bae', 'email', 500)
ON CONFLICT DO NOTHING;

-- Insert sample service subscriptions
INSERT INTO public.user_service_subscriptions (user_id, service_id, status)
SELECT 
  'd10e2a2e-7d61-40c6-8f1b-c2b928538bae',
  sc.id,
  'active'
FROM public.services_catalog sc
WHERE sc.service_type IN ('sms', 'email')
ON CONFLICT DO NOTHING;