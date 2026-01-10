-- Add preview_link column to tabibi_apps table
ALTER TABLE public.tabibi_apps 
ADD COLUMN IF NOT EXISTS preview_link text;
