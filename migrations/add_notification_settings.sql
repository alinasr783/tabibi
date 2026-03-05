-- Add notification settings columns to user_preferences table
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS notification_types JSONB DEFAULT '{"appointments": true, "financial": true, "subscription": true}'::jsonb,
ADD COLUMN IF NOT EXISTS toast_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS toast_duration INTEGER DEFAULT 3;
