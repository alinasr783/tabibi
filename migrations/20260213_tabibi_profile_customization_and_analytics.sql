CREATE TABLE IF NOT EXISTS public.clinic_profile_settings (
  clinic_id uuid NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinic_profile_settings_pkey PRIMARY KEY (clinic_id)
);

ALTER TABLE public.clinic_profile_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view clinic profile settings" ON public.clinic_profile_settings;
CREATE POLICY "Public can view clinic profile settings"
ON public.clinic_profile_settings
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Doctors can manage clinic profile settings" ON public.clinic_profile_settings;
CREATE POLICY "Doctors can manage clinic profile settings"
ON public.clinic_profile_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.user_id = auth.uid()::text
      AND u.role = 'doctor'
      AND u.clinic_id = clinic_profile_settings.clinic_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.user_id = auth.uid()::text
      AND u.role = 'doctor'
      AND u.clinic_id = clinic_profile_settings.clinic_id
  )
);

CREATE TABLE IF NOT EXISTS public.clinic_profile_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  visitor_id uuid,
  event_type text NOT NULL CHECK (
    event_type = ANY (
      ARRAY[
        'profile_view'::text,
        'booking_click'::text,
        'action_call'::text,
        'action_whatsapp'::text,
        'action_share'::text,
        'action_location'::text
      ]
    )
  ),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinic_profile_analytics_pkey PRIMARY KEY (id)
);

ALTER TABLE public.clinic_profile_analytics ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS clinic_profile_analytics_clinic_created_idx
ON public.clinic_profile_analytics (clinic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS clinic_profile_analytics_clinic_event_created_idx
ON public.clinic_profile_analytics (clinic_id, event_type, created_at DESC);

DROP POLICY IF EXISTS "Public can insert clinic profile analytics" ON public.clinic_profile_analytics;
CREATE POLICY "Public can insert clinic profile analytics"
ON public.clinic_profile_analytics
FOR INSERT
TO public
WITH CHECK (clinic_id IS NOT NULL);

DROP POLICY IF EXISTS "Doctors can view clinic profile analytics" ON public.clinic_profile_analytics;
CREATE POLICY "Doctors can view clinic profile analytics"
ON public.clinic_profile_analytics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.user_id = auth.uid()::text
      AND u.role = 'doctor'
      AND u.clinic_id = clinic_profile_analytics.clinic_id
  )
);
