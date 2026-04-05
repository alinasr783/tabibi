-- Add summary column to patients table
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS summary text;

-- Add comment for clarity
COMMENT ON COLUMN public.patients.summary IS 'AI-generated summary of the patient record';
