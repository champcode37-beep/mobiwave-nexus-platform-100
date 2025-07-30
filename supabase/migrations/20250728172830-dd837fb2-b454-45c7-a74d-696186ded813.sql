-- Add missing sender_id column to api_credentials table
ALTER TABLE api_credentials ADD COLUMN IF NOT EXISTS sender_id CHARACTER VARYING;