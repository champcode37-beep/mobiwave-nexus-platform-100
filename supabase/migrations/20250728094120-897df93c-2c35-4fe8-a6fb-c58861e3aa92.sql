-- Add all missing columns and fix database structure mismatches

-- Add missing columns to existing tables
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS cost numeric DEFAULT 0;

ALTER TABLE public.message_history ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.user_service_subscriptions ADD COLUMN IF NOT EXISTS activated_at timestamp with time zone;
ALTER TABLE public.user_service_subscriptions ADD COLUMN IF NOT EXISTS setup_fee_paid boolean DEFAULT false;
ALTER TABLE public.user_service_subscriptions ADD COLUMN IF NOT EXISTS monthly_billing_active boolean DEFAULT false;

ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0;
ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS total_purchased numeric DEFAULT 0;

-- Add missing columns to workflows table
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS subscription_id character varying;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS service_code character varying;

-- Update workflows RLS policy
CREATE POLICY IF NOT EXISTS "Users can manage their own workflows" 
ON public.workflows 
FOR ALL 
USING (auth.uid() = user_id);