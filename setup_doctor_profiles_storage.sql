-- 1. Create the storage bucket for doctor profiles if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('doctor-profiles', 'doctor-profiles', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies for the bucket to ensure clean state
DROP POLICY IF EXISTS "Authenticated users can upload doctor profiles" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update doctor profiles" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read doctor profiles" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete doctor profiles" ON storage.objects;
DROP POLICY IF EXISTS "Public can view doctor profiles" ON storage.objects;

-- 3. Create policies for storage.objects
-- Allow upload for authenticated users
CREATE POLICY "Authenticated users can upload doctor profiles"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'doctor-profiles');

-- Allow update for authenticated users
CREATE POLICY "Authenticated users can update doctor profiles"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'doctor-profiles');

-- Allow read for everyone (since it's public profiles)
CREATE POLICY "Public can view doctor profiles"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'doctor-profiles');

-- Allow delete for authenticated users
CREATE POLICY "Authenticated users can delete doctor profiles"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'doctor-profiles');

-- 4. Ensure users table has the new columns (in case they weren't added)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS education jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS certificates jsonb DEFAULT '[]'::jsonb;
