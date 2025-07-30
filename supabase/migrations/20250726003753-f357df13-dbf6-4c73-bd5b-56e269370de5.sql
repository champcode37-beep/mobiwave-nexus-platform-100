-- Add missing columns to profiles table that the application expects
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add basic RLS policies for security_events table
CREATE POLICY IF NOT EXISTS "Users can view security events" 
ON public.security_events 
FOR SELECT 
USING (auth.uid() = user_id OR public.user_has_permission(auth.uid(), 'system_settings'));

CREATE POLICY IF NOT EXISTS "System can insert security events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

-- Add basic RLS policies for audit_logs table  
CREATE POLICY IF NOT EXISTS "Users can view their audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (auth.uid() = user_id OR public.user_has_permission(auth.uid(), 'system_settings'));

CREATE POLICY IF NOT EXISTS "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Update profiles table to set super_admin role for existing user
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'malingib9@gmail.com' AND role != 'super_admin';