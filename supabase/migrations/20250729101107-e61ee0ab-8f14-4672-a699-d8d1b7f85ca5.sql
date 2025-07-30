-- Update the Mspace API credentials with the correct username and API key
UPDATE api_credentials 
SET 
  username = 'JAMalingi',
  api_key_encrypted = '85704279c42eb7a76fce54c6ed9865260ec1830919b5f9845256f785695a28c03ee87e897be3f0a996ad08905ac81eb720a5c33c2ed9642220b17b730a656de6',
  updated_at = now()
WHERE service_name = 'mspace' 
  AND user_id = '9827ca0a-a689-40aa-9744-53ec16000a92';