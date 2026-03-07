-- Migration to add AI Settings column to user_preferences table
-- Run this SQL in your Supabase Dashboard SQL Editor

-- Add ai_settings column as JSONB
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT '{"enabled_pages": {"patient_file": true}, "context": {"specialty": "", "clinic_goal": "", "doctor_persona": "", "custom_instructions": ""}}'::jsonb;

-- Comment on the column
COMMENT ON COLUMN public.user_preferences.ai_settings IS 'Stores AI customization settings including enabled pages and clinic context';

-- Example update (optional, just for reference)
-- UPDATE public.user_preferences SET ai_settings = '{"enabled_pages": {"patient_file": true}, "context": {"specialty": "General", "clinic_goal": "Care", "doctor_persona": "Friendly", "custom_instructions": ""}}'::jsonb WHERE ai_settings IS NULL;
