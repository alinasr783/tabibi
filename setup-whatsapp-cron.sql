-- Enable pg_cron (requires database restart if not previously loaded in shared_preload_libraries)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to run every 10 minutes
-- IMPORTANT: Replace PROJECT_REF and SERVICE_ROLE_KEY with your actual Supabase project details
SELECT cron.schedule(
  'send-whatsapp-reminders',
  '*/10 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://hvbjysojjrdkszuvczbc.supabase.co/functions/v1/send-whatsapp-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
