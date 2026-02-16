CREATE TABLE IF NOT EXISTS public.affiliate_link_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  referral_code text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('open', 'signup')),
  path text,
  referrer text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_link_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_link_events_insert_any" ON public.affiliate_link_events;
CREATE POLICY "affiliate_link_events_insert_any"
  ON public.affiliate_link_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(referral_code) >= 4
    AND length(referral_code) <= 64
    AND event_type IN ('open', 'signup')
  );

DROP POLICY IF EXISTS "affiliate_link_events_select_own" ON public.affiliate_link_events;
CREATE POLICY "affiliate_link_events_select_own"
  ON public.affiliate_link_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.affiliate_users au
      WHERE au.user_id = auth.uid()
        AND au.referral_code = affiliate_link_events.referral_code
    )
  );
