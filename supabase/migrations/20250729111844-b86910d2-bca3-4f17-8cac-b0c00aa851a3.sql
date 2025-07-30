-- Update the API key with the correct value for JNEXUS
UPDATE public.api_credentials 
SET api_key_encrypted = 'e52eb4b54c5b3bd956bba142688d38cdf1d6eef5ac947a920d0c1602d651f944de9339d19db4d3286c43d8b5e5624b767707dd5fb7be4b78701138d60c841a4a'
WHERE service_name = 'mspace' AND username = 'JNEXUS';