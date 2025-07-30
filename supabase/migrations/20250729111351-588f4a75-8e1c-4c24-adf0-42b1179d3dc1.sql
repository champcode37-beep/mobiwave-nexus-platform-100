-- Update Mspace credentials with correct username JNEXUS
UPDATE public.api_credentials 
SET username = 'JNEXUS'
WHERE service_name = 'mspace' AND user_id IN (
  SELECT id FROM auth.users LIMIT 1
);