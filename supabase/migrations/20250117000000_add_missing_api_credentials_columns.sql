-- Add missing columns to api_credentials table
ALTER TABLE public.api_credentials 
ADD COLUMN IF NOT EXISTS username VARCHAR(255),
ADD COLUMN IF NOT EXISTS sender_id VARCHAR(20);

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_api_credentials_username ON public.api_credentials(username);
CREATE INDEX IF NOT EXISTS idx_api_credentials_sender_id ON public.api_credentials(sender_id);

-- Migrate existing data from additional_config to proper columns (if additional_config exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'api_credentials' 
               AND column_name = 'additional_config') THEN
        
        UPDATE public.api_credentials 
        SET 
            username = COALESCE(username, additional_config->>'username'),
            sender_id = COALESCE(sender_id, additional_config->>'sender_id')
        WHERE username IS NULL OR sender_id IS NULL;
        
        -- Remove the additional_config column as we now use proper columns
        ALTER TABLE public.api_credentials DROP COLUMN IF EXISTS additional_config;
    END IF;
END $$;