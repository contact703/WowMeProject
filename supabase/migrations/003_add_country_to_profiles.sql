-- Add country field to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';

-- Add comment
COMMENT ON COLUMN profiles.country IS 'ISO 3166-1 alpha-2 country code (e.g., US, BR, ES, CN)';

