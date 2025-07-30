-- Clean API Credentials Schema - Remove additional_config and use proper columns only
-- This ensures we only use: user_id, service_name, api_key_encrypted, username, sender_id

-- First ensure all required columns exist
ALTER TABLE public.api_credentials 
ADD COLUMN IF NOT EXISTS username VARCHAR(255),
ADD COLUMN IF NOT EXISTS sender_id VARCHAR(20);

-- Migrate any remaining data from additional_config if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'api_credentials' 
               AND column_name = 'additional_config') THEN
        
        -- Migrate data from additional_config to proper columns
        UPDATE public.api_credentials 
        SET 
            username = COALESCE(username, additional_config->>'username'),
            sender_id = COALESCE(sender_id, additional_config->>'sender_id', 'MSPACE')
        WHERE additional_config IS NOT NULL 
        AND (username IS NULL OR sender_id IS NULL);
        
        -- Remove the additional_config column completely
        ALTER TABLE public.api_credentials DROP COLUMN additional_config;
        
        RAISE NOTICE 'Removed additional_config column and migrated data to proper columns';
    END IF;
END $$;

-- Ensure sender_id has a default value for existing records
UPDATE public.api_credentials 
SET sender_id = 'MSPACE' 
WHERE sender_id IS NULL OR sender_id = '';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_credentials_username ON public.api_credentials(username);
CREATE INDEX IF NOT EXISTS idx_api_credentials_sender_id ON public.api_credentials(sender_id);

-- Add NOT NULL constraints for required fields
ALTER TABLE public.api_credentials 
ALTER COLUMN username SET NOT NULL,
ALTER COLUMN sender_id SET DEFAULT 'MSPACE';

-- Verify the final schema
DO $$
BEGIN
    RAISE NOTICE 'API Credentials table now uses only these columns:';
    RAISE NOTICE '- id (UUID, Primary Key)';
    RAISE NOTICE '- user_id (UUID, Foreign Key to profiles)';
    RAISE NOTICE '- service_name (VARCHAR, NOT NULL)';
    RAISE NOTICE '- api_key_encrypted (TEXT)';
    RAISE NOTICE '- username (VARCHAR, NOT NULL)';
    RAISE NOTICE '- sender_id (VARCHAR, DEFAULT MSPACE)';
    RAISE NOTICE '- is_active (BOOLEAN, DEFAULT true)';
    RAISE NOTICE '- created_at (TIMESTAMP)';
    RAISE NOTICE '- updated_at (TIMESTAMP)';
    RAISE NOTICE 'additional_config column has been removed';
END $$;