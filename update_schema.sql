-- Add missing columns to users table for doctor profile
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS specialty text,
ADD COLUMN IF NOT EXISTS banner_url text;

-- Add comments for clarity
COMMENT ON COLUMN public.users.specialty IS 'Doctor specialty (e.g., Cardiology)';
COMMENT ON COLUMN public.users.banner_url IS 'URL for the profile banner image';
