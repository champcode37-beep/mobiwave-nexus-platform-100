-- Fix database schema issues

-- Add missing columns to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS type character varying DEFAULT 'sms';

-- Create credit_transactions table (referenced in CreditsManager)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    type character varying NOT NULL, -- 'topup_request', 'usage', 'refund'
    amount numeric NOT NULL,
    status character varying DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    description text,
    reference character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for credit_transactions
CREATE POLICY "Users can view their own transactions" 
ON public.credit_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.credit_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage transactions" 
ON public.credit_transactions 
FOR ALL 
USING (auth.role() = 'service_role');

-- Update user_credits table structure to match expected schema
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS credits_remaining integer DEFAULT 0;
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS credits_purchased integer DEFAULT 0;
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add missing columns to services_catalog
ALTER TABLE services_catalog ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;
ALTER TABLE services_catalog ADD COLUMN IF NOT EXISTS setup_fee numeric DEFAULT 0;
ALTER TABLE services_catalog ADD COLUMN IF NOT EXISTS monthly_fee numeric DEFAULT 0;

-- Add missing columns to system_audit_logs for consistency
ALTER TABLE system_audit_logs ADD COLUMN IF NOT EXISTS old_data jsonb;
ALTER TABLE system_audit_logs ADD COLUMN IF NOT EXISTS new_data jsonb;
ALTER TABLE system_audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Add missing columns to admin_profile_audit_log for consistency  
ALTER TABLE admin_profile_audit_log ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Create workflows table for automation
CREATE TABLE IF NOT EXISTS public.workflows (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name character varying NOT NULL,
    description text,
    trigger_type character varying NOT NULL,
    trigger_config jsonb DEFAULT '{}',
    actions jsonb DEFAULT '[]',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on workflows
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Create policies for workflows
CREATE POLICY "Users can manage their own workflows" 
ON public.workflows 
FOR ALL 
USING (auth.uid() = user_id);

-- Add trigger for updated_at on credit_transactions
CREATE TRIGGER update_credit_transactions_updated_at
    BEFORE UPDATE ON public.credit_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on workflows
CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON public.workflows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on user_credits
CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON public.user_credits
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();