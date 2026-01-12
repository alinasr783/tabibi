
-- Add views_count to tabibi_apps if it doesn't exist
ALTER TABLE public.tabibi_apps 
ADD COLUMN IF NOT EXISTS views_count bigint DEFAULT 0;

-- Function to increment views safely
CREATE OR REPLACE FUNCTION increment_app_views(app_uuid bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tabibi_apps
  SET views_count = views_count + 1
  WHERE id = app_uuid;
END;
$$;
