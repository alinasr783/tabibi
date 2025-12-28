-- Migration: Add daily appointments email settings
-- This adds columns to user_preferences for daily email notification settings

-- Add daily email settings columns to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS daily_appointments_email_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS daily_appointments_email_time text DEFAULT '07:00',
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Africa/Cairo';

-- Create index for efficient querying of enabled email users
CREATE INDEX IF NOT EXISTS idx_user_preferences_daily_email 
ON public.user_preferences (daily_appointments_email_enabled) 
WHERE daily_appointments_email_enabled = true;

-- Create a log table for email sending history
CREATE TABLE IF NOT EXISTS public.daily_email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clinic_id uuid,
  email_to text NOT NULL,
  appointments_count integer NOT NULL DEFAULT 0,
  sent_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message text,
  CONSTRAINT daily_email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT daily_email_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- RLS policies for daily_email_logs
ALTER TABLE public.daily_email_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own email logs
CREATE POLICY "Users can view own email logs" ON public.daily_email_logs
FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update logs
CREATE POLICY "Service role can manage email logs" ON public.daily_email_logs
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create function to get daily appointments for a user
CREATE OR REPLACE FUNCTION get_daily_appointments_for_email(p_clinic_id uuid, p_date text)
RETURNS TABLE (
  id bigint,
  patient_name text,
  patient_phone text,
  appointment_time text,
  status text,
  notes text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    p.name as patient_name,
    p.phone as patient_phone,
    a.date as appointment_time,
    a.status,
    a.notes
  FROM appointments a
  JOIN patients p ON a.patient_id = p.id
  WHERE a.clinic_id = p_clinic_id
    AND a.date LIKE p_date || '%'
    AND a.status IN ('confirmed', 'pending', 'scheduled')
  ORDER BY a.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_daily_appointments_for_email(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_appointments_for_email(uuid, text) TO service_role;

COMMENT ON TABLE public.daily_email_logs IS 'Tracks daily appointment email sending history';
COMMENT ON COLUMN public.user_preferences.daily_appointments_email_enabled IS 'Whether to send daily appointment email to this user';
COMMENT ON COLUMN public.user_preferences.daily_appointments_email_time IS 'Time to send daily email in HH:MM format';
COMMENT ON COLUMN public.user_preferences.timezone IS 'User timezone for email scheduling';
