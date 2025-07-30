-- Fix foreign key constraints in security_events and audit_logs tables
-- Drop existing foreign key constraints if they exist
ALTER TABLE security_events DROP CONSTRAINT IF EXISTS security_events_user_id_fkey;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- Create user_credits table if not exists
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

-- Drop and recreate policy for user_credits
DROP POLICY IF EXISTS "Users can manage their own credits" ON public.user_credits;
CREATE POLICY "Users can manage their own credits" 
ON public.user_credits 
FOR ALL 
USING (auth.uid() = user_id);

-- Add trigger if not exists
DROP TRIGGER IF EXISTS update_user_credits_updated_at ON public.user_credits;
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO public.user_credits (user_id, service_type, credits) 
VALUES 
  ('d10e2a2e-7d61-40c6-8f1b-c2b928538bae', 'sms', 100),
  ('d10e2a2e-7d61-40c6-8f1b-c2b928538bae', 'email', 500)
ON CONFLICT DO NOTHING;