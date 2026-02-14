ALTER TABLE public.treatment_templates
ADD COLUMN IF NOT EXISTS advanced_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

