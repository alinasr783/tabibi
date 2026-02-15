CREATE TABLE IF NOT EXISTS public.affiliate_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  affiliate_user_id uuid NOT NULL REFERENCES public.affiliate_users(user_id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id)
);

CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  affiliate_user_id uuid NOT NULL REFERENCES public.affiliate_users(user_id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL,
  subscription_id bigint NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  base_amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0.1,
  commission_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','void')),
  available_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  UNIQUE (subscription_id)
);

ALTER TABLE public.affiliate_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_users_select_own" ON public.affiliate_users;
CREATE POLICY "affiliate_users_select_own"
  ON public.affiliate_users
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "affiliate_users_insert_own" ON public.affiliate_users;
CREATE POLICY "affiliate_users_insert_own"
  ON public.affiliate_users
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "affiliate_users_update_own" ON public.affiliate_users;
CREATE POLICY "affiliate_users_update_own"
  ON public.affiliate_users
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "affiliate_referrals_select_own" ON public.affiliate_referrals;
CREATE POLICY "affiliate_referrals_select_own"
  ON public.affiliate_referrals
  FOR SELECT
  USING (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "affiliate_commissions_select_own" ON public.affiliate_commissions;
CREATE POLICY "affiliate_commissions_select_own"
  ON public.affiliate_commissions
  FOR SELECT
  USING (auth.uid() = affiliate_user_id);

CREATE OR REPLACE FUNCTION public.generate_affiliate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
BEGIN
  LOOP
    code := upper(substr(encode(gen_random_bytes(16), 'hex'), 1, 10));
    IF NOT EXISTS (SELECT 1 FROM public.affiliate_users WHERE referral_code = code) THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_affiliate_profile()
RETURNS public.affiliate_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  row public.affiliate_users;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO row FROM public.affiliate_users WHERE user_id = uid;
  IF row.user_id IS NOT NULL THEN
    RETURN row;
  END IF;

  INSERT INTO public.affiliate_users (user_id, referral_code)
  VALUES (uid, public.generate_affiliate_referral_code())
  RETURNING * INTO row;

  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_affiliate_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_affiliate_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_affiliate_referral(referral_code text, clinic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  affiliate_id uuid;
  doctor_clinic uuid;
  doctor_role text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT u.clinic_id, u.role INTO doctor_clinic, doctor_role
  FROM public.users u
  WHERE u.user_id = uid::text
  LIMIT 1;

  IF doctor_role IS DISTINCT FROM 'doctor' THEN
    RETURN;
  END IF;

  IF doctor_clinic IS NULL OR doctor_clinic IS DISTINCT FROM apply_affiliate_referral.clinic_id THEN
    RETURN;
  END IF;

  SELECT user_id INTO affiliate_id
  FROM public.affiliate_users
  WHERE public.affiliate_users.referral_code = apply_affiliate_referral.referral_code;

  IF affiliate_id IS NULL THEN
    RETURN;
  END IF;

  IF affiliate_id = uid THEN
    RETURN;
  END IF;

  INSERT INTO public.affiliate_referrals (affiliate_user_id, clinic_id)
  VALUES (affiliate_id, apply_affiliate_referral.clinic_id)
  ON CONFLICT (clinic_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_affiliate_referral(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_affiliate_referral(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_affiliate_commission_rate(affiliate_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clinics uuid[];
  active_count integer;
BEGIN
  SELECT array_agg(r.clinic_id) INTO clinics
  FROM public.affiliate_referrals r
  WHERE r.affiliate_user_id = get_affiliate_commission_rate.affiliate_user_id;

  IF clinics IS NULL THEN
    RETURN 0.10;
  END IF;

  SELECT count(*) INTO active_count
  FROM public.subscriptions s
  WHERE s.status = 'active'
    AND s.clinic_id = ANY (clinics);

  IF active_count >= 20 THEN
    RETURN 0.15;
  ELSIF active_count >= 5 THEN
    RETURN 0.12;
  END IF;

  RETURN 0.10;
END;
$$;

REVOKE ALL ON FUNCTION public.get_affiliate_commission_rate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_affiliate_commission_rate(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_affiliate_commission_for_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affiliate_id uuid;
  amount numeric;
  rate numeric;
  available timestamptz;
BEGIN
  SELECT affiliate_user_id INTO affiliate_id
  FROM public.affiliate_referrals
  WHERE clinic_id = NEW.clinic_id;

  IF affiliate_id IS NULL THEN
    RETURN NEW;
  END IF;

  amount := COALESCE(NEW.amount, 0);
  IF amount <= 0 THEN
    RETURN NEW;
  END IF;

  rate := public.get_affiliate_commission_rate(affiliate_id);
  available := now() + interval '14 days';

  INSERT INTO public.affiliate_commissions (
    affiliate_user_id,
    clinic_id,
    subscription_id,
    base_amount,
    commission_rate,
    commission_amount,
    status,
    available_at
  ) VALUES (
    affiliate_id,
    NEW.clinic_id,
    NEW.id,
    amount,
    rate,
    amount * rate,
    'pending',
    available
  )
  ON CONFLICT (subscription_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_affiliate_commission_for_subscription ON public.subscriptions;
CREATE TRIGGER trg_create_affiliate_commission_for_subscription
AFTER INSERT ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.create_affiliate_commission_for_subscription();

CREATE OR REPLACE FUNCTION public.void_affiliate_commission_on_subscription_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status IS DISTINCT FROM 'active' THEN
    UPDATE public.affiliate_commissions
    SET status = 'void'
    WHERE subscription_id = NEW.id
      AND status = 'pending'
      AND available_at > now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_void_affiliate_commission_on_subscription_cancel ON public.subscriptions;
CREATE TRIGGER trg_void_affiliate_commission_on_subscription_cancel
AFTER UPDATE OF status ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.void_affiliate_commission_on_subscription_cancel();

DROP TYPE IF EXISTS public.affiliate_dashboard_stats CASCADE;
CREATE TYPE public.affiliate_dashboard_stats AS (
  doctors_registered integer,
  doctors_active integer,
  total_earnings numeric,
  this_month_earnings numeric,
  expected_next_month_earnings numeric,
  pending_earnings numeric,
  paid_earnings numeric
);

CREATE OR REPLACE FUNCTION public.get_affiliate_dashboard_stats()
RETURNS public.affiliate_dashboard_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  clinics uuid[];
  doctors_registered integer;
  doctors_active integer;
  total_earnings numeric;
  this_month_earnings numeric;
  pending_earnings numeric;
  paid_earnings numeric;
  expected_next_month_earnings numeric;
  rate numeric;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT array_agg(r.clinic_id) INTO clinics
  FROM public.affiliate_referrals r
  WHERE r.affiliate_user_id = uid;

  SELECT count(*) INTO doctors_registered
  FROM public.affiliate_referrals r
  WHERE r.affiliate_user_id = uid;

  SELECT count(*) INTO doctors_active
  FROM public.subscriptions s
  WHERE s.status = 'active'
    AND clinics IS NOT NULL
    AND s.clinic_id = ANY (clinics);

  SELECT COALESCE(sum(c.commission_amount), 0) INTO total_earnings
  FROM public.affiliate_commissions c
  WHERE c.affiliate_user_id = uid
    AND c.status <> 'void';

  SELECT COALESCE(sum(c.commission_amount), 0) INTO this_month_earnings
  FROM public.affiliate_commissions c
  WHERE c.affiliate_user_id = uid
    AND c.status <> 'void'
    AND c.created_at >= date_trunc('month', now());

  SELECT COALESCE(sum(c.commission_amount), 0) INTO pending_earnings
  FROM public.affiliate_commissions c
  WHERE c.affiliate_user_id = uid
    AND c.status = 'pending';

  SELECT COALESCE(sum(c.commission_amount), 0) INTO paid_earnings
  FROM public.affiliate_commissions c
  WHERE c.affiliate_user_id = uid
    AND c.status = 'paid';

  rate := public.get_affiliate_commission_rate(uid);

  SELECT COALESCE(sum(COALESCE(s.amount, 0) * rate), 0) INTO expected_next_month_earnings
  FROM public.subscriptions s
  WHERE s.status = 'active'
    AND clinics IS NOT NULL
    AND s.clinic_id = ANY (clinics);

  RETURN (
    doctors_registered,
    doctors_active,
    total_earnings,
    this_month_earnings,
    expected_next_month_earnings,
    pending_earnings,
    paid_earnings
  )::public.affiliate_dashboard_stats;
END;
$$;

REVOKE ALL ON FUNCTION public.get_affiliate_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_affiliate_dashboard_stats() TO authenticated;

ALTER TABLE public.tabibi_apps ADD COLUMN IF NOT EXISTS icon_name text;

INSERT INTO public.tabibi_apps (
  title,
  short_description,
  full_description,
  price,
  billing_period,
  image_url,
  category,
  features,
  screenshots,
  component_key,
  is_active,
  color,
  preview_link,
  developer_id,
  integration_type,
  integration_target,
  icon_name
) VALUES (
  'Tabibi Affiliate',
  'إدارة روابط الإحالة والعمولات المتكررة',
  'تطبيق لإدارة برنامج التسويق بالعمولة: رابط إحالة + QR + لوحة تحكم + مستويات محفزة + عمولات شهرية متكررة طالما الطبيب مشترك.',
  0,
  'one_time',
  NULL,
  'Marketing',
  '[]'::jsonb,
  '[]'::jsonb,
  'tabibi_affiliate',
  true,
  'bg-primary/10',
  '/affiliate',
  NULL,
  'none',
  NULL,
  'Handshake'
)
ON CONFLICT (component_key) DO UPDATE SET
  title = EXCLUDED.title,
  short_description = EXCLUDED.short_description,
  full_description = EXCLUDED.full_description,
  price = EXCLUDED.price,
  billing_period = EXCLUDED.billing_period,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  color = EXCLUDED.color,
  preview_link = EXCLUDED.preview_link,
  integration_type = EXCLUDED.integration_type,
  integration_target = EXCLUDED.integration_target,
  icon_name = EXCLUDED.icon_name;
