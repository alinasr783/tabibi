-- 1. Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-attachments', 'patient-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies for the bucket to ensure clean state
DROP POLICY IF EXISTS "Authenticated users can upload patient attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update patient attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read patient attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete patient attachments" ON storage.objects;

-- 3. Create comprehensive policies for storage.objects
-- Allow upload
CREATE POLICY "Authenticated users can upload patient attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'patient-attachments');

-- Allow update
CREATE POLICY "Authenticated users can update patient attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'patient-attachments');

-- Allow read (public access is enabled on bucket, but good to have explicit policy for authenticated)
CREATE POLICY "Authenticated users can read patient attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'patient-attachments');

-- Allow delete
CREATE POLICY "Authenticated users can delete patient attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'patient-attachments');

-- 4. Add description column if it doesn't exist
ALTER TABLE public.patient_attachments ADD COLUMN IF NOT EXISTS description TEXT;

-- 5. Ensure RLS is enabled on the table (it should be, but good to verify)
ALTER TABLE public.patient_attachments ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing table policies if any
DROP POLICY IF EXISTS "Users can view attachments from their clinic" ON public.patient_attachments;
DROP POLICY IF EXISTS "Users can insert attachments for their clinic" ON public.patient_attachments;
DROP POLICY IF EXISTS "Users can update attachments for their clinic" ON public.patient_attachments;
DROP POLICY IF EXISTS "Users can delete attachments for their clinic" ON public.patient_attachments;

-- 7. Create policies for patient_attachments table
-- SELECT: Users can view attachments if they belong to the same clinic
CREATE POLICY "Users can view attachments from their clinic"
ON public.patient_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_uid = auth.uid()
    AND users.clinic_id = patient_attachments.clinic_id
  )
);

-- INSERT: Users can insert attachments if they belong to the same clinic
CREATE POLICY "Users can insert attachments for their clinic"
ON public.patient_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_uid = auth.uid()
    AND users.clinic_id = patient_attachments.clinic_id
  )
);

-- UPDATE: Users can update attachments if they belong to the same clinic
CREATE POLICY "Users can update attachments for their clinic"
ON public.patient_attachments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_uid = auth.uid()
    AND users.clinic_id = patient_attachments.clinic_id
  )
);

-- DELETE: Users can delete attachments if they belong to the same clinic
CREATE POLICY "Users can delete attachments for their clinic"
ON public.patient_attachments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_uid = auth.uid()
    AND users.clinic_id = patient_attachments.clinic_id
  )
);
