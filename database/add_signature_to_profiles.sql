-- Add signature field to profiles table
-- This field will store the user's digital signature as base64 encoded image data

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS signature TEXT;

-- Add comment to the column for documentation
COMMENT ON COLUMN profiles.signature IS 'Base64 encoded PNG image data of user digital signature';

