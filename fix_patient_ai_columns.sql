-- 1. Add summary column to patients table (if not exists)
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS summary text;

-- 2. Add ai_chat_log column to patients table to fix TabibiIntelligence error
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS ai_chat_log jsonb DEFAULT '[]'::jsonb;

-- 3. Add comments for clarity
COMMENT ON COLUMN public.patients.summary IS 'AI-generated summary of the patient record';
COMMENT ON COLUMN public.patients.ai_chat_log IS 'History of AI assistant conversations for this patient';

-- 4. Refresh schema cache
NOTIFY pgrst, 'reload schema';
