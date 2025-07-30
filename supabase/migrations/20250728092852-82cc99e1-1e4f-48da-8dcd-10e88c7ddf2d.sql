-- Create additional missing tables referenced in components

-- USSD related tables
CREATE TABLE IF NOT EXISTS public.ussd_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    phone_number character varying NOT NULL,
    session_id character varying NOT NULL,
    input_path character varying,
    navigation_path character varying[],
    status character varying DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mspace_ussd_applications (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name character varying NOT NULL,
    shortcode character varying,
    flow_config jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.ussd_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mspace_ussd_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own USSD sessions" 
ON public.ussd_sessions 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own USSD applications" 
ON public.mspace_ussd_applications 
FOR ALL 
USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_ussd_sessions_updated_at
    BEFORE UPDATE ON public.ussd_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mspace_ussd_applications_updated_at
    BEFORE UPDATE ON public.mspace_ussd_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();