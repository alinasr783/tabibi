-- Setup Cron Job for Daily Appointments Email
-- This SQL sets up the pg_cron extension to call the edge function

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule the daily email job
-- Runs every hour to check which users need emails based on their timezone
SELECT cron.schedule(
  'send-daily-appointments-email',  -- Job name
  '0 * * * *',                      -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-daily-appointments-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Alternative: Simple cron at 7 AM Cairo time (5 AM UTC)
-- SELECT cron.schedule(
--   'send-daily-appointments-email-7am',
--   '0 5 * * *',  -- 5 AM UTC = 7 AM Cairo
--   $$
--   SELECT net.http_post(
--     url := 'https://your-project.supabase.co/functions/v1/send-daily-appointments-email',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- View scheduled jobs
-- SELECT * FROM cron.job;

-- To unschedule:
-- SELECT cron.unschedule('send-daily-appointments-email');
