-- Drop existing user_credits table if it exists and recreate with correct structure
DROP TABLE IF EXISTS public.user_credits CASCADE;

-- Create user_credits table with simplified structure
CREATE TABLE public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_type character varying NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  credits_purchased INTEGER NOT NULL DEFAULT 0,
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

-- Add updated_at trigger
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for testing
INSERT INTO public.user_credits (user_id, service_type, credits, credits_remaining, credits_purchased) 
VALUES 
  ('d10e2a2e-7d61-40c6-8f1b-c2b928538bae', 'sms', 100, 100, 100),
  ('d10e2a2e-7d61-40c6-8f1b-c2b928538bae', 'email', 500, 500, 500)
ON CONFLICT DO NOTHING;