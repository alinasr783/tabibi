-- Create whatsapp_settings table
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL,
  enabled_immediate boolean DEFAULT true,
  enabled_reminder boolean DEFAULT true,
  reminder_offset_minutes integer DEFAULT 30 CHECK (reminder_offset_minutes BETWEEN 10 AND 720),
  immediate_template text DEFAULT 'تم تأكيد حجزك في {clinic_name} يوم {date} الساعة {time}. من فضلك احضر قبل 10 دقائق.',
  reminder_template text DEFAULT 'باقي {offset} دقيقة على ميعادك في {clinic_name} الساعة {time}. نورتنا.',
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT whatsapp_settings_clinic_id_unique UNIQUE (clinic_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Policies for whatsapp_settings
-- FIX: Changed 'id' to 'auth_uid' in subqueries to match UUID type
CREATE POLICY "Users can view their clinic whatsapp settings"
ON public.whatsapp_settings FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.users WHERE auth_uid = auth.uid()
  )
);

CREATE POLICY "Users can update their clinic whatsapp settings"
ON public.whatsapp_settings FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.users WHERE auth_uid = auth.uid()
  )
)
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM public.users WHERE auth_uid = auth.uid()
  )
);

CREATE POLICY "Users can insert their clinic whatsapp settings"
ON public.whatsapp_settings FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM public.users WHERE auth_uid = auth.uid()
  )
);

-- Create whatsapp_message_logs table
CREATE TABLE IF NOT EXISTS public.whatsapp_message_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL,
  appointment_id uuid, -- Keeping as uuid assuming appointments.id will be cast or is uuid in future, but currently appointments.id is bigint. 
                       -- WAIT: appointments.id is bigint in database.txt.
                       -- We should change appointment_id to bigint to match.
  patient_phone text,
  message_type text CHECK (message_type IN ('booking', 'reminder')),
  status text CHECK (status IN ('sent', 'failed', 'pending')),
  provider_message_id text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- FIX: Alter appointment_id to bigint if it was created as uuid, or create as bigint
-- Dropping and recreating the table definition in this script to be safe since it might not exist yet.
-- If table exists with uuid, this script assumes fresh run or we need ALTER.
-- For safety, let's use explicit type for the log table.

DROP TABLE IF EXISTS public.whatsapp_message_logs;
CREATE TABLE public.whatsapp_message_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL,
  appointment_id bigint, -- Fixed to match appointments.id (bigint)
  patient_phone text,
  message_type text CHECK (message_type IN ('booking', 'reminder')),
  status text CHECK (status IN ('sent', 'failed', 'pending')),
  provider_message_id text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- Policies for whatsapp_message_logs
-- FIX: Changed 'id' to 'auth_uid'
CREATE POLICY "Users can view their clinic whatsapp logs"
ON public.whatsapp_message_logs FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.users WHERE auth_uid = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_clinic_id ON public.whatsapp_message_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON public.whatsapp_message_logs(created_at);

-- Function to get due reminders
CREATE OR REPLACE FUNCTION get_due_whatsapp_reminders()
RETURNS TABLE (
  appointment_id bigint, -- Fixed to match appointments.id
  clinic_id uuid,
  patient_name text,
  patient_phone text,
  appointment_time timestamp, -- date column in appointments is text but castable? database.txt says 'date text'. We need to cast it.
  reminder_template text,
  clinic_name text,
  reminder_offset integer,
  instance_id text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as appointment_id,
    a.clinic_id,
    p.name as patient_name,
    p.phone as patient_phone,
    -- Attempt to cast date text to timestamp. If format is ISO, this works.
    a.date::timestamp as appointment_time,
    ws.reminder_template,
    c.name as clinic_name,
    ws.reminder_offset_minutes as reminder_offset,
    (i.settings->>'instance_id')::text as instance_id
  FROM appointments a
  JOIN whatsapp_settings ws ON a.clinic_id = ws.clinic_id
  JOIN clinics c ON a.clinic_id = c.clinic_uuid
  JOIN patients p ON a.patient_id = p.id
  LEFT JOIN integrations i ON a.clinic_id = i.clinic_id AND i.provider = 'message-pro' AND i.integration_type = 'whatsapp'
  WHERE 
    ws.enabled_reminder = true
    AND i.is_active = true
    AND (a.status = 'Confirmed' OR a.status IS NULL)
    -- Compare timestamp
    AND a.date::timestamp >= now()
    AND a.date::timestamp <= now() + interval '12 hours'
    -- Logic
    AND EXTRACT(EPOCH FROM (a.date::timestamp - now())) / 60 BETWEEN (ws.reminder_offset_minutes - 5) AND (ws.reminder_offset_minutes + 5)
    AND NOT EXISTS (
      SELECT 1 FROM whatsapp_message_logs l 
      WHERE l.appointment_id = a.id 
      AND l.message_type = 'reminder'
      AND l.status = 'sent'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
