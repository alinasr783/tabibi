-- Add integration fields to tabibi_apps
ALTER TABLE public.tabibi_apps 
ADD COLUMN IF NOT EXISTS integration_type text DEFAULT 'none' CHECK (integration_type IN ('none', 'full', 'partial')),
ADD COLUMN IF NOT EXISTS integration_target text;

-- Add integration status to subscriptions
ALTER TABLE public.app_subscriptions 
ADD COLUMN IF NOT EXISTS is_integrated boolean DEFAULT false;

-- Comment on columns
COMMENT ON COLUMN public.tabibi_apps.integration_type IS 'Type of integration: full (replaces page) or partial (injects component)';
COMMENT ON COLUMN public.tabibi_apps.integration_target IS 'Target route (e.g. /appointments) or slot name (e.g. patient_summary)';

-- Example Data Updates (Uncomment and modify ID or Title to match your actual data)

-- 1. Full Integration Example (Advanced Online Booking -> Replaces /appointments)
UPDATE public.tabibi_apps
SET 
  integration_type = 'full',
  integration_target = '/online-booking'
WHERE component_key = 'advanced_online_booking';

-- 2. Partial Integration Example (Patient History Summary -> Injects into patient_summary slot)
-- UPDATE public.tabibi_apps
-- SET 
--   integration_type = 'partial',
--   integration_target = 'patient_summary'
-- WHERE component_key = 'patient_history_summary';
