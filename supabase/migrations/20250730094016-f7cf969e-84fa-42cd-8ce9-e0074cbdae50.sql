-- Fix the function to match actual column types
CREATE OR REPLACE FUNCTION public.authenticate_client_profile(login_identifier text, login_password text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  client_name character varying(255),
  username character varying(100),
  email character varying(255),
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.user_id,
    cp.client_name,
    cp.username,
    cp.email,
    cp.is_active
  FROM client_profiles cp
  WHERE (cp.email = login_identifier OR cp.username = login_identifier)
    AND cp.password_hash = encode(login_password::bytea, 'base64')
    AND cp.is_active = true;
END;
$$;