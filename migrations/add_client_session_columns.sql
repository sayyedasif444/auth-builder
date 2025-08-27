-- Migration: Add client session columns to tokens table
-- This allows tokens to be created for client-based authentication

-- Add new columns to tokens table
ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS realm_id INTEGER REFERENCES realms(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_client_session BOOLEAN DEFAULT FALSE;

-- Make user_id nullable since client sessions won't have a user_id
ALTER TABLE tokens 
ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint to ensure either user_id or client_id is present
ALTER TABLE tokens 
ADD CONSTRAINT check_user_or_client 
CHECK (
    (user_id IS NOT NULL AND client_id IS NULL AND realm_id IS NULL) OR 
    (user_id IS NULL AND client_id IS NOT NULL AND realm_id IS NOT NULL)
);

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_tokens_client_id ON tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_tokens_realm_id ON tokens(realm_id);
CREATE INDEX IF NOT EXISTS idx_tokens_is_client_session ON tokens(is_client_session);

-- Update existing tokens to ensure they have user_id (not client_id)
UPDATE tokens SET user_id = user_id WHERE user_id IS NOT NULL;
