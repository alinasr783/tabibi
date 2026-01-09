-- 1. Create Whatsapp Settings Table
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL UNIQUE,
  enabled_immediate boolean DEFAULT true,
  enabled_reminder boolean DEFAULT true,
  reminder_offset_minutes integer DEFAULT 30 CHECK (reminder_offset_minutes BETWEEN 1 AND 720),
  immediate_template text DEFAULT 'تم تأكيد حجزك في {clinic_name} يوم {date} الساعة {time}. من فضلك احضر قبل 10 دقائق.',
  reminder_template text DEFAULT 'باقي {offset} دقيقة على ميعادك في {clinic_name} الساعة {time}. نورتنا.',
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Policies for whatsapp_settings
DROP POLICY IF EXISTS "Users can view whatsapp settings for their clinic" ON public.whatsapp_settings;
CREATE POLICY "Users can view whatsapp settings for their clinic"
ON public.whatsapp_settings FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.users WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update whatsapp settings for their clinic" ON public.whatsapp_settings;
CREATE POLICY "Users can update whatsapp settings for their clinic"
ON public.whatsapp_settings FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.users WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert whatsapp settings for their clinic" ON public.whatsapp_settings;
CREATE POLICY "Users can insert whatsapp settings for their clinic"
ON public.whatsapp_settings FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM public.users WHERE user_id = auth.uid()
  )
);

-- 2. Add columns to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS whatsapp_booking_sent boolean DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS whatsapp_reminder_sent boolean DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS whatsapp_booking_message_id text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS whatsapp_reminder_message_id text;

-- 3. Create Whatsapp Message Logs Table
CREATE TABLE IF NOT EXISTS public.whatsapp_message_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL,
  appointment_id bigint,
  patient_id bigint,
  message_type text NOT NULL CHECK (message_type = ANY (ARRAY['booking','reminder'])),
  status text NOT NULL CHECK (status = ANY (ARRAY['sent','failed','skipped'])),
  message_id text,
  error_message text,
  request_payload jsonb DEFAULT '{}'::jsonb,
  response_payload jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- Policies for whatsapp_message_logs
DROP POLICY IF EXISTS "Users can view whatsapp logs for their clinic" ON public.whatsapp_message_logs;
CREATE POLICY "Users can view whatsapp logs for their clinic"
ON public.whatsapp_message_logs FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.users WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert whatsapp logs for their clinic" ON public.whatsapp_message_logs;
CREATE POLICY "Users can insert whatsapp logs for their clinic"
ON public.whatsapp_message_logs FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM public.users WHERE user_id = auth.uid()
  )
);

-- 4. Index for integrations (Optional but good for performance)
CREATE INDEX IF NOT EXISTS idx_integrations_clinic_provider_type 
ON public.integrations (clinic_id, provider, integration_type);

CREATE UNIQUE INDEX IF NOT EXISTS integrations_unique_clinic_provider_type
ON public.integrations (clinic_id, provider, integration_type)
WHERE clinic_id IS NOT NULL;

-- 5. Setup Cron Job (requires pg_cron extension)
-- Note: This part might need to be run by a superuser or via the Supabase Dashboard SQL Editor if the extension is not enabled.
-- We wrap it in a DO block to avoid errors if pg_cron is missing or permission is denied
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule the whatsapp reminder job (every minute)
    PERFORM cron.schedule(
      'send-whatsapp-reminders',
      '* * * * *',
      $cron_sql$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/send-whatsapp-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
      )
      $cron_sql$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule cron job: %', SQLERRM;
END $$;
