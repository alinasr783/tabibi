ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS medical_fields_config jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.visits
ADD COLUMN IF NOT EXISTS treatment text;

ALTER TABLE public.visits
ADD COLUMN IF NOT EXISTS follow_up text;

ALTER TABLE public.visits
ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '[]'::jsonb;

