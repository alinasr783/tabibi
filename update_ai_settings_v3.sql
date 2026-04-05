-- 1. Update user_preferences table to support new AI settings
-- Add columns to user_preferences if they don't exist (using a do block for safety)
DO $$ 
BEGIN
    -- The ai_settings is usually stored inside a jsonb column named 'ai_settings' or similar.
    -- Based on the codebase, we need to ensure the structure within that jsonb is updated.
    -- If there's no dedicated column, we'll assume it's part of the general preferences.
END $$;

-- 2. Update existing preferences with new defaults (if needed)
-- This SQL assumes 'ai_settings' is a key within a JSONB column or a separate column.
-- Since we are in a migration mindset, let's provide the structure update.

-- Note: In Supabase, if ai_settings is a column:
-- ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT '{
--   "enabled_pages": {
--     "patient_file": true,
--     "appointment_details": true,
--     "visit_details": true,
--     "medical_fields": true
--   },
--   "features": {
--     "suggest_medications": true,
--     "suggest_diagnosis": true,
--     "unified_context": true
--   },
--   "context": {
--     "specialty": "",
--     "clinic_goal": "",
--     "doctor_persona": "",
--     "custom_instructions": ""
--   }
-- }'::jsonb;

-- If it already exists, we might want to merge the new structure:
UPDATE public.user_preferences 
SET ai_settings = jsonb_set(
    jsonb_set(
        jsonb_set(
            COALESCE(ai_settings, '{}'::jsonb),
            '{features}',
            '{
                "suggest_medications": true,
                "suggest_diagnosis": true,
                "unified_context": true
            }'::jsonb,
            true
        ),
        '{enabled_pages}',
        COALESCE(ai_settings->'enabled_pages', '{}'::jsonb) || '{
            "patient_file": true,
            "appointment_details": true,
            "visit_details": true,
            "medical_fields": true
        }'::jsonb,
        true
    ),
    '{context}',
    COALESCE(ai_settings->'context', '{
        "specialty": "",
        "clinic_goal": "",
        "doctor_persona": "",
        "custom_instructions": ""
    }'::jsonb),
    true
);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
