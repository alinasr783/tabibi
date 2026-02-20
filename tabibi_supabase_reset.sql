BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.payment_type AS ENUM ('subscription', 'wallet', 'app_purchase');
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.transactions_reference_number_seq;

CREATE TABLE IF NOT EXISTS public.plans (
  created_at timestamptz NOT NULL DEFAULT now(),
  id text NOT NULL,
  name text,
  limits jsonb,
  price numeric,
  CONSTRAINT plans_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.plan_pricing (
  created_at timestamptz NOT NULL DEFAULT now(),
  price real,
  id text NOT NULL,
  features jsonb,
  popular boolean,
  name text,
  description text,
  CONSTRAINT plan_pricing_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.discounts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  code text,
  is_percentage boolean,
  value real,
  is_active boolean,
  plan_id text,
  max_uses integer,
  used_count integer DEFAULT 0,
  expiration_date timestamptz,
  message text,
  billing_period text DEFAULT 'both' CHECK (billing_period = ANY (ARRAY['monthly','annual','both'])),
  CONSTRAINT discounts_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.clinics (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text,
  address text,
  booking_price integer,
  available_time jsonb,
  current_plan text,
  clinic_uuid uuid DEFAULT gen_random_uuid() UNIQUE,
  online_booking_enabled boolean DEFAULT true,
  clinic_id_bigint bigint,
  whatsapp_enabled boolean DEFAULT false,
  whatsapp_number text,
  prevent_conflicts boolean DEFAULT false,
  min_time_gap integer DEFAULT 30,
  CONSTRAINT clinics_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text,
  phone text,
  role text,
  permissions text,
  email text,
  user_id text,
  clinic_id uuid,
  auth_uid uuid,
  clinic_id_bigint bigint,
  avatar_url text,
  bio text,
  education jsonb DEFAULT '[]'::jsonb,
  certificates jsonb DEFAULT '[]'::jsonb,
  specialty text,
  banner_url text,
  contacts jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.patients (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text,
  phone text,
  address text,
  date_of_birth text,
  blood_type text,
  gender text,
  clinic_id uuid,
  age integer,
  updated_at timestamptz DEFAULT now(),
  age_unit text DEFAULT 'years',
  job text,
  marital_status text,
  email text,
  notes text,
  medical_history jsonb DEFAULT '{}'::jsonb,
  insurance_info jsonb DEFAULT '{}'::jsonb,
  custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT patients_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  patient_id bigint,
  date text,
  notes text,
  status text,
  price bigint,
  "from" text,
  clinic_id uuid,
  age bigint,
  diagnosis text,
  treatment text,
  custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT appointments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.treatment_templates (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text,
  session_count integer,
  session_price integer,
  description text,
  clinic_id uuid,
  updated_at timestamptz DEFAULT now(),
  advanced_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT treatment_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.patient_plans (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  template_id bigint,
  total_sessions integer,
  completed_sessions integer,
  status text,
  patient_id bigint,
  total_price bigint,
  clinic_id uuid,
  updated_at timestamptz DEFAULT now(),
  advanced_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT patient_plans_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.visits (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  patient_id bigint,
  diagnosis text,
  notes text,
  medications jsonb,
  clinic_id uuid,
  patient_plan_id bigint,
  treatment text,
  follow_up text,
  custom_fields jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT visits_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.financial_records (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  clinic_id bigint NOT NULL,
  appointment_id bigint,
  patient_id bigint,
  patient_plan_id bigint,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['income','expense','charge'])),
  description text NOT NULL,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  visit_id bigint,
  reference_key text,
  CONSTRAINT financial_records_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS financial_records_clinic_reference_key_uidx
ON public.financial_records (clinic_id, reference_key)
WHERE reference_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  plan_id text,
  status text DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  payment_method text,
  billing_period text DEFAULT 'monthly' CHECK (billing_period = ANY (ARRAY['monthly','annual'])),
  amount numeric,
  clinic_id uuid,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.affiliate_users (
  user_id uuid NOT NULL,
  referral_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_users_pkey PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  affiliate_user_id uuid NOT NULL,
  clinic_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_referrals_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  affiliate_user_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  subscription_id bigint NOT NULL UNIQUE,
  base_amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0.1,
  commission_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','approved','paid','void'])),
  available_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  withdrawal_request_id uuid,
  CONSTRAINT affiliate_commissions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.affiliate_link_events (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  referral_code text NOT NULL,
  event_type text NOT NULL CHECK (event_type = 'open'),
  path text,
  referrer text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_link_events_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.affiliate_payout_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL,
  payout_method text NOT NULL DEFAULT 'bank' CHECK (payout_method = ANY (ARRAY['bank','wallet'])),
  bank_name text,
  account_name text,
  iban text,
  wallet_phone text,
  notes text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_payout_methods_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.affiliate_payment_settings (
  affiliate_user_id uuid NOT NULL,
  payout_method text NOT NULL DEFAULT 'bank' CHECK (payout_method = ANY (ARRAY['bank','wallet'])),
  bank_name text,
  account_name text,
  iban text,
  wallet_phone text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_payment_settings_pkey PRIMARY KEY (affiliate_user_id)
);

CREATE TABLE IF NOT EXISTS public.affiliate_withdrawal_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','approved','rejected','processed','paid'])),
  payout_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  payout_method_id uuid,
  CONSTRAINT affiliate_withdrawal_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.affiliate_withdrawal_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  request_id uuid NOT NULL,
  commission_id bigint NOT NULL UNIQUE,
  CONSTRAINT affiliate_withdrawal_items_pkey PRIMARY KEY (id)
);

ALTER TABLE public.affiliate_users
  ADD CONSTRAINT affiliate_users_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.affiliate_referrals
  ADD CONSTRAINT affiliate_referrals_affiliate_user_id_fkey
  FOREIGN KEY (affiliate_user_id) REFERENCES public.affiliate_users(user_id) ON DELETE CASCADE;

ALTER TABLE public.affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_affiliate_user_id_fkey
  FOREIGN KEY (affiliate_user_id) REFERENCES public.affiliate_users(user_id) ON DELETE CASCADE;

ALTER TABLE public.affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_subscription_id_fkey
  FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;

ALTER TABLE public.affiliate_payout_methods
  ADD CONSTRAINT affiliate_payout_methods_affiliate_user_id_fkey
  FOREIGN KEY (affiliate_user_id) REFERENCES public.affiliate_users(user_id) ON DELETE CASCADE;

ALTER TABLE public.affiliate_payment_settings
  ADD CONSTRAINT affiliate_payment_settings_affiliate_user_id_fkey
  FOREIGN KEY (affiliate_user_id) REFERENCES public.affiliate_users(user_id) ON DELETE CASCADE;

ALTER TABLE public.affiliate_withdrawal_requests
  ADD CONSTRAINT affiliate_withdrawal_requests_affiliate_user_id_fkey
  FOREIGN KEY (affiliate_user_id) REFERENCES public.affiliate_users(user_id) ON DELETE CASCADE;

ALTER TABLE public.affiliate_withdrawal_requests
  ADD CONSTRAINT affiliate_withdrawal_requests_payout_method_id_fkey
  FOREIGN KEY (payout_method_id) REFERENCES public.affiliate_payout_methods(id) ON DELETE SET NULL;

ALTER TABLE public.affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_withdrawal_request_id_fkey
  FOREIGN KEY (withdrawal_request_id) REFERENCES public.affiliate_withdrawal_requests(id) ON DELETE SET NULL;

ALTER TABLE public.affiliate_withdrawal_items
  ADD CONSTRAINT affiliate_withdrawal_items_request_id_fkey
  FOREIGN KEY (request_id) REFERENCES public.affiliate_withdrawal_requests(id);

ALTER TABLE public.affiliate_withdrawal_items
  ADD CONSTRAINT affiliate_withdrawal_items_commission_id_fkey
  FOREIGN KEY (commission_id) REFERENCES public.affiliate_commissions(id);

ALTER TABLE public.affiliate_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_link_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payout_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_withdrawal_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_users_select_own" ON public.affiliate_users;
DROP POLICY IF EXISTS "affiliate_users_insert_own" ON public.affiliate_users;
DROP POLICY IF EXISTS "affiliate_users_update_own" ON public.affiliate_users;
CREATE POLICY "affiliate_users_select_own" ON public.affiliate_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "affiliate_users_insert_own" ON public.affiliate_users FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "affiliate_users_update_own" ON public.affiliate_users FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "affiliate_referrals_select_own" ON public.affiliate_referrals;
CREATE POLICY "affiliate_referrals_select_own" ON public.affiliate_referrals FOR SELECT USING (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "affiliate_commissions_select_own" ON public.affiliate_commissions;
CREATE POLICY "affiliate_commissions_select_own" ON public.affiliate_commissions FOR SELECT USING (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "affiliate_link_events_public_insert" ON public.affiliate_link_events;
CREATE POLICY "affiliate_link_events_public_insert" ON public.affiliate_link_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "affiliate_payout_methods_select_own" ON public.affiliate_payout_methods;
DROP POLICY IF EXISTS "affiliate_payout_methods_insert_own" ON public.affiliate_payout_methods;
DROP POLICY IF EXISTS "affiliate_payout_methods_update_own" ON public.affiliate_payout_methods;
DROP POLICY IF EXISTS "affiliate_payout_methods_delete_own" ON public.affiliate_payout_methods;
CREATE POLICY "affiliate_payout_methods_select_own" ON public.affiliate_payout_methods FOR SELECT USING (auth.uid() = affiliate_user_id);
CREATE POLICY "affiliate_payout_methods_insert_own" ON public.affiliate_payout_methods FOR INSERT WITH CHECK (auth.uid() = affiliate_user_id);
CREATE POLICY "affiliate_payout_methods_update_own" ON public.affiliate_payout_methods FOR UPDATE USING (auth.uid() = affiliate_user_id) WITH CHECK (auth.uid() = affiliate_user_id);
CREATE POLICY "affiliate_payout_methods_delete_own" ON public.affiliate_payout_methods FOR DELETE USING (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "affiliate_payment_settings_select_own" ON public.affiliate_payment_settings;
DROP POLICY IF EXISTS "affiliate_payment_settings_insert_own" ON public.affiliate_payment_settings;
DROP POLICY IF EXISTS "affiliate_payment_settings_update_own" ON public.affiliate_payment_settings;
CREATE POLICY "affiliate_payment_settings_select_own" ON public.affiliate_payment_settings FOR SELECT USING (auth.uid() = affiliate_user_id);
CREATE POLICY "affiliate_payment_settings_insert_own" ON public.affiliate_payment_settings FOR INSERT WITH CHECK (auth.uid() = affiliate_user_id);
CREATE POLICY "affiliate_payment_settings_update_own" ON public.affiliate_payment_settings FOR UPDATE USING (auth.uid() = affiliate_user_id) WITH CHECK (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "affiliate_withdrawal_requests_select_own" ON public.affiliate_withdrawal_requests;
DROP POLICY IF EXISTS "affiliate_withdrawal_requests_insert_own" ON public.affiliate_withdrawal_requests;
CREATE POLICY "affiliate_withdrawal_requests_select_own" ON public.affiliate_withdrawal_requests FOR SELECT USING (auth.uid() = affiliate_user_id);
CREATE POLICY "affiliate_withdrawal_requests_insert_own" ON public.affiliate_withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = affiliate_user_id);

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
  WHERE u.auth_uid = uid OR u.user_id = uid::text
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
    RETURN 0.20;
  END IF;

  SELECT count(*) INTO active_count
  FROM public.subscriptions s
  WHERE s.status = 'active'
    AND s.clinic_id = ANY (clinics);

  IF active_count >= 20 THEN
    RETURN 0.30;
  ELSIF active_count >= 5 THEN
    RETURN 0.25;
  END IF;

  RETURN 0.20;
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

DROP FUNCTION IF EXISTS public.upsert_affiliate_payout_method(uuid, text, text, text, text, text, text, boolean) CASCADE;
CREATE OR REPLACE FUNCTION public.upsert_affiliate_payout_method(
  payout_method_id uuid,
  payout_method text,
  bank_name text,
  account_name text,
  iban text,
  wallet_phone text,
  notes text,
  make_default boolean DEFAULT false
)
RETURNS public.affiliate_payout_methods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  row public.affiliate_payout_methods;
  exists_default boolean;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.affiliate_payout_methods m
    WHERE m.affiliate_user_id = uid AND m.is_default = true
  ) INTO exists_default;

  IF upsert_affiliate_payout_method.payout_method_id IS NULL THEN
    INSERT INTO public.affiliate_payout_methods (
      affiliate_user_id, payout_method, bank_name, account_name, iban, wallet_phone, notes, is_default, updated_at
    )
    VALUES (
      uid,
      COALESCE(upsert_affiliate_payout_method.payout_method, 'bank'),
      upsert_affiliate_payout_method.bank_name,
      upsert_affiliate_payout_method.account_name,
      upsert_affiliate_payout_method.iban,
      upsert_affiliate_payout_method.wallet_phone,
      upsert_affiliate_payout_method.notes,
      COALESCE(upsert_affiliate_payout_method.make_default, false) = true OR exists_default = false,
      now()
    )
    RETURNING * INTO row;
  ELSE
    UPDATE public.affiliate_payout_methods m
    SET payout_method = COALESCE(upsert_affiliate_payout_method.payout_method, m.payout_method),
        bank_name = upsert_affiliate_payout_method.bank_name,
        account_name = upsert_affiliate_payout_method.account_name,
        iban = upsert_affiliate_payout_method.iban,
        wallet_phone = upsert_affiliate_payout_method.wallet_phone,
        notes = upsert_affiliate_payout_method.notes,
        updated_at = now()
    WHERE m.id = upsert_affiliate_payout_method.payout_method_id
      AND m.affiliate_user_id = uid
    RETURNING * INTO row;
  END IF;

  IF row.id IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF COALESCE(upsert_affiliate_payout_method.make_default, false) = true OR exists_default = false THEN
    UPDATE public.affiliate_payout_methods
    SET is_default = (id = row.id), updated_at = now()
    WHERE affiliate_user_id = uid;
    row.is_default := true;
  END IF;

  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_affiliate_payout_method(uuid, text, text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_affiliate_payout_method(uuid, text, text, text, text, text, text, boolean) TO authenticated;

DROP FUNCTION IF EXISTS public.set_default_affiliate_payout_method(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.set_default_affiliate_payout_method(payout_method_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.affiliate_payout_methods
  SET is_default = false, updated_at = now()
  WHERE affiliate_user_id = uid;

  UPDATE public.affiliate_payout_methods
  SET is_default = true, updated_at = now()
  WHERE affiliate_user_id = uid
    AND id = set_default_affiliate_payout_method.payout_method_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_default_affiliate_payout_method(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_default_affiliate_payout_method(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.delete_affiliate_payout_method(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.delete_affiliate_payout_method(payout_method_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  was_default boolean;
  fallback_id uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT is_default INTO was_default
  FROM public.affiliate_payout_methods m
  WHERE m.id = delete_affiliate_payout_method.payout_method_id
    AND m.affiliate_user_id = uid;

  DELETE FROM public.affiliate_payout_methods m
  WHERE m.id = delete_affiliate_payout_method.payout_method_id
    AND m.affiliate_user_id = uid;

  IF COALESCE(was_default, false) = true THEN
    SELECT id INTO fallback_id
    FROM public.affiliate_payout_methods
    WHERE affiliate_user_id = uid
    ORDER BY created_at DESC
    LIMIT 1;

    IF fallback_id IS NOT NULL THEN
      UPDATE public.affiliate_payout_methods
      SET is_default = true, updated_at = now()
      WHERE id = fallback_id;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_affiliate_payout_method(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_affiliate_payout_method(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_affiliate_withdrawable_balance() CASCADE;
CREATE OR REPLACE FUNCTION public.get_affiliate_withdrawable_balance()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  available numeric;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT COALESCE(sum(c.commission_amount), 0) INTO available
  FROM public.affiliate_commissions c
  WHERE c.affiliate_user_id = uid
    AND c.status = 'pending'
    AND c.available_at <= now()
    AND c.withdrawal_request_id IS NULL;

  RETURN COALESCE(available, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_affiliate_withdrawable_balance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_affiliate_withdrawable_balance() TO authenticated;

DROP FUNCTION IF EXISTS public.request_affiliate_withdrawal() CASCADE;
CREATE OR REPLACE FUNCTION public.request_affiliate_withdrawal()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  amount numeric;
  payout public.affiliate_payout_methods;
  req_id uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  amount := public.get_affiliate_withdrawable_balance();
  IF amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_balance');
  END IF;

  SELECT * INTO payout
  FROM public.affiliate_payout_methods
  WHERE affiliate_user_id = uid AND is_default = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF payout.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_payout_method');
  END IF;

  INSERT INTO public.affiliate_withdrawal_requests (
    affiliate_user_id, payout_method_id, amount, status, payout_snapshot
  )
  VALUES (
    uid, payout.id, amount, 'pending',
    jsonb_build_object(
      'payout_method', payout.payout_method,
      'bank_name', payout.bank_name,
      'account_name', payout.account_name,
      'iban', payout.iban,
      'wallet_phone', payout.wallet_phone,
      'notes', payout.notes
    )
  )
  RETURNING id INTO req_id;

  UPDATE public.affiliate_commissions
  SET withdrawal_request_id = req_id
  WHERE affiliate_user_id = uid
    AND status = 'pending'
    AND available_at <= now()
    AND withdrawal_request_id IS NULL;

  RETURN jsonb_build_object('success', true, 'request_id', req_id, 'amount', amount);
END;
$$;

REVOKE ALL ON FUNCTION public.request_affiliate_withdrawal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_affiliate_withdrawal() TO authenticated;

CREATE TABLE IF NOT EXISTS public.discount_redemptions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  discount_id bigint NOT NULL,
  clinic_id uuid,
  appointment_id bigint,
  patient_plan_id bigint,
  subscription_id bigint,
  redeemed_by bigint,
  amount_discounted numeric,
  CONSTRAINT discount_redemptions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.clinic_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0.00,
  currency text DEFAULT 'EGP',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT clinic_wallets_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['deposit','payment','refund','adjustment','bonus'])),
  description text,
  reference_type text,
  reference_id text,
  status text DEFAULT 'completed' CHECK (status = ANY (ARRAY['pending','completed','failed','cancelled'])),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.app_developers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  company_name text,
  email text NOT NULL,
  phone text,
  website text,
  status text DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','approved','suspended'])),
  api_key text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT app_developers_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.developer_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0.00,
  currency text DEFAULT 'EGP',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT developer_wallets_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.developer_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['earning','withdrawal','refund','adjustment'])),
  description text,
  reference_id text,
  reference_type text,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT developer_transactions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL,
  wallet_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','approved','rejected','processed'])),
  bank_details text,
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tabibi_apps (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz DEFAULT now(),
  title text NOT NULL,
  short_description text,
  full_description text,
  price numeric DEFAULT 0,
  billing_period text DEFAULT 'monthly' CHECK (billing_period = ANY (ARRAY['monthly','yearly','one_time'])),
  image_url text,
  category text,
  features jsonb DEFAULT '[]'::jsonb,
  screenshots jsonb DEFAULT '[]'::jsonb,
  component_key text UNIQUE,
  is_active boolean DEFAULT true,
  color text,
  preview_link text,
  developer_id uuid,
  submission_schema jsonb DEFAULT '{}'::jsonb,
  images jsonb DEFAULT '[]'::jsonb,
  views_count bigint DEFAULT 0,
  integration_type text DEFAULT 'none' CHECK (integration_type = ANY (ARRAY['none','full','partial'])),
  integration_target text,
  icon_name text,
  CONSTRAINT tabibi_apps_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.app_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  image_url text,
  screenshots jsonb DEFAULT '[]'::jsonb,
  links jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','in_review','approved','rejected'])),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT app_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.app_subscriptions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  clinic_id uuid NOT NULL,
  app_id bigint,
  status text DEFAULT 'active' CHECK (status = ANY (ARRAY['active','expired','cancelled','past_due'])),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,
  billing_period text,
  amount numeric,
  auto_renew boolean DEFAULT true,
  is_integrated boolean DEFAULT false,
  pricing_type text,
  payment_type text,
  interval_unit text,
  interval_count integer,
  trial_interval_unit text,
  trial_interval_count integer,
  trial_end timestamptz,
  currency text,
  CONSTRAINT app_subscriptions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.app_data_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  app_id bigint NOT NULL,
  clinic_id uuid,
  submission_type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT app_data_submissions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.ai_agent_profile (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bio text,
  avatar_url text,
  banner_url text,
  skills jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT ai_agent_profile_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL,
  excerpt text,
  featured_image text,
  author_name text DEFAULT 'فريق طبيبي',
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'published' CHECK (status = ANY (ARRAY['draft','published','archived'])),
  meta_title text,
  meta_description text,
  keywords text[],
  views_count integer DEFAULT 0,
  CONSTRAINT articles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clinic_id uuid,
  provider text NOT NULL,
  integration_type text NOT NULL,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  token_type text,
  id_token text,
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT integrations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type varchar NOT NULL,
  title varchar NOT NULL,
  message text,
  clinic_id uuid NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  related_id varchar,
  appointment_id bigint,
  patient_id bigint,
  image_url text,
  action_link text,
  action_text text,
  action_buttons jsonb,
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  device_type text DEFAULT 'web',
  created_at timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now(),
  CONSTRAINT fcm_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT fcm_tokens_user_token_unique UNIQUE (user_id, token)
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  theme_mode text DEFAULT 'light' CHECK (theme_mode = ANY (ARRAY['light','dark','system'])),
  primary_color varchar DEFAULT '#1AA19C',
  secondary_color varchar DEFAULT '#224FB5',
  accent_color varchar DEFAULT '#FF6B6B',
  logo_url text,
  company_name text,
  menu_items jsonb DEFAULT '[]'::jsonb,
  sidebar_collapsed boolean DEFAULT false,
  sidebar_style text DEFAULT 'default' CHECK (sidebar_style = ANY (ARRAY['default','compact','full'])),
  language text DEFAULT 'ar' CHECK (language = ANY (ARRAY['ar','en'])),
  notifications_enabled boolean DEFAULT true,
  sound_notifications boolean DEFAULT true,
  dashboard_widgets jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  daily_appointments_email_enabled boolean DEFAULT false,
  daily_appointments_email_time text DEFAULT '07:00',
  timezone text DEFAULT 'Africa/Cairo',
  tabibi_ai_settings jsonb DEFAULT '{}'::jsonb,
  medical_fields_config jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT user_preferences_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.daily_email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clinic_id uuid,
  email_to text NOT NULL,
  appointments_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz DEFAULT now(),
  status text DEFAULT 'sent' CHECK (status = ANY (ARRAY['sent','failed','skipped'])),
  error_message text,
  CONSTRAINT daily_email_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.patient_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  patient_id bigint,
  clinic_id uuid,
  file_name text,
  file_url text NOT NULL,
  file_type text,
  category text,
  description text,
  CONSTRAINT patient_attachments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.blocked_phones (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  clinic_id uuid NOT NULL,
  phone_number text NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  CONSTRAINT blocked_phones_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.booking_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  visitor_id text,
  ip_address text,
  country text,
  city text,
  device_type text,
  browser text,
  event_type text CHECK (event_type = ANY (ARRAY['view','conversion','blocked_attempt'])),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT booking_analytics_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.booking_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  visitor_id text,
  session_id text,
  current_step integer,
  patient_name text,
  patient_phone text,
  selected_date text,
  selected_time text,
  form_data jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'in_progress' CHECK (status = ANY (ARRAY['in_progress','completed','abandoned'])),
  CONSTRAINT booking_drafts_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.clinic_profile_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  visitor_id uuid,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['profile_view','booking_click','action_call','action_whatsapp','action_share','action_location'])),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinic_profile_analytics_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.clinic_profile_settings (
  clinic_id uuid NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinic_profile_settings_pkey PRIMARY KEY (clinic_id)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reference_number integer NOT NULL DEFAULT nextval('public.transactions_reference_number_seq'::regclass),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  user_id uuid,
  clinic_id uuid,
  easykash_ref text,
  amount numeric NOT NULL,
  currency text DEFAULT 'EGP',
  status public.payment_status DEFAULT 'pending',
  type public.payment_type NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  response_data jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT transactions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_reference_number ON public.transactions(reference_number);

CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  clinic_id uuid NOT NULL,
  enabled boolean DEFAULT false,
  whatsapp_number text,
  reminder_days_before integer DEFAULT 1,
  reminder_time text DEFAULT '09:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT whatsapp_settings_clinic_id_unique UNIQUE (clinic_id)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_message_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clinic_id uuid NOT NULL,
  patient_id bigint,
  appointment_id bigint,
  message_type text,
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_clinic_id ON public.whatsapp_message_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON public.whatsapp_message_logs(created_at);

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clinic_id text NOT NULL,
  title text DEFAULT 'محادثة جديدة',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_archived boolean DEFAULT false,
  CONSTRAINT chat_conversations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['user','assistant','system'])),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_clinic_id ON public.chat_conversations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON public.chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

CREATE TABLE IF NOT EXISTS public.tabibi_app_scopes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  scope_code text NOT NULL UNIQUE,
  description text NOT NULL,
  category text NOT NULL,
  risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT tabibi_app_scopes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tabibi_developers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  website text,
  verification_status text DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'suspended')),
  developer_key text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT tabibi_developers_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tabibi_marketplace_apps (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  developer_id uuid NOT NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  short_description text,
  full_description text,
  icon_url text,
  cover_image_url text,
  category text,
  tags text[],
  is_paid boolean DEFAULT false,
  price_monthly numeric DEFAULT 0,
  price_yearly numeric DEFAULT 0,
  has_free_trial boolean DEFAULT false,
  trial_days integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  kill_switch_active boolean DEFAULT false,
  kill_switch_reason text,
  install_count bigint DEFAULT 0,
  average_rating numeric(3,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tabibi_app_versions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  app_id bigint NOT NULL,
  version_number text NOT NULL,
  js_entry_point text,
  css_bundle text,
  status text DEFAULT 'draft' CHECK (status IN ('draft','submitted','in_review','approved','rejected','archived')),
  reviewer_notes text,
  rejection_reason text,
  changelog text,
  created_at timestamptz DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT tabibi_app_versions_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_versions_number ON public.tabibi_app_versions(app_id, version_number);

CREATE TABLE IF NOT EXISTS public.tabibi_app_version_scopes (
  version_id uuid NOT NULL,
  scope_id uuid NOT NULL,
  justification text,
  PRIMARY KEY (version_id, scope_id)
);

CREATE TABLE IF NOT EXISTS public.tabibi_app_schema_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  app_id bigint NOT NULL,
  developer_id uuid NOT NULL,
  table_name text NOT NULL,
  sql_structure text NOT NULL,
  purpose text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','applied','rejected')),
  admin_response text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT tabibi_app_schema_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tabibi_app_installations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  clinic_id uuid NOT NULL,
  app_id bigint NOT NULL,
  installed_version_id uuid,
  auto_update boolean DEFAULT true,
  status text DEFAULT 'active' CHECK (status IN ('active','trialing','past_due','cancelled','suspended')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  is_frozen boolean DEFAULT false,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (clinic_id, app_id),
  CONSTRAINT tabibi_app_installations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tabibi_app_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  app_id bigint NOT NULL,
  clinic_id uuid NOT NULL,
  action text NOT NULL,
  resource text,
  metadata jsonb,
  severity text DEFAULT 'info',
  timestamp timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tabibi_app_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  app_id bigint NOT NULL,
  clinic_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_verified_purchase boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tabibi_app_event_subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  app_id bigint NOT NULL,
  event_type text NOT NULL,
  handler_function_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT tabibi_app_event_subscriptions_pkey PRIMARY KEY (id)
);

CREATE OR REPLACE VIEW public.view_marketplace_storefront AS
SELECT
  app.id,
  app.title,
  app.short_description,
  app.icon_url,
  app.price_monthly,
  app.has_free_trial,
  app.average_rating,
  dev.name as developer_name,
  ver.version_number as latest_version
FROM public.tabibi_marketplace_apps app
JOIN public.tabibi_developers dev ON app.developer_id = dev.id
LEFT JOIN LATERAL (
  SELECT version_number
  FROM public.tabibi_app_versions
  WHERE app_id = app.id AND status = 'approved'
  ORDER BY created_at DESC
  LIMIT 1
) ver ON true
WHERE app.kill_switch_active = false;

ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES public.plans(id);

ALTER TABLE public.clinics
  ADD CONSTRAINT clinics_current_plan_fkey
  FOREIGN KEY (current_plan) REFERENCES public.plans(id);

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id);

ALTER TABLE public.patient_plans
  ADD CONSTRAINT patient_plans_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES public.treatment_templates(id);

ALTER TABLE public.patient_plans
  ADD CONSTRAINT patient_plans_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id);

ALTER TABLE public.visits
  ADD CONSTRAINT visits_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id);

ALTER TABLE public.financial_records
  ADD CONSTRAINT financial_records_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);

ALTER TABLE public.financial_records
  ADD CONSTRAINT financial_records_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id);

ALTER TABLE public.financial_records
  ADD CONSTRAINT financial_records_patient_plan_id_fkey
  FOREIGN KEY (patient_plan_id) REFERENCES public.patient_plans(id);

ALTER TABLE public.financial_records
  ADD CONSTRAINT financial_records_visit_id_fkey
  FOREIGN KEY (visit_id) REFERENCES public.visits(id);

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES public.plans(id);

ALTER TABLE public.discount_redemptions
  ADD CONSTRAINT discount_redemptions_discount_id_fkey
  FOREIGN KEY (discount_id) REFERENCES public.discounts(id);

ALTER TABLE public.discount_redemptions
  ADD CONSTRAINT discount_redemptions_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);

ALTER TABLE public.discount_redemptions
  ADD CONSTRAINT discount_redemptions_patient_plan_id_fkey
  FOREIGN KEY (patient_plan_id) REFERENCES public.patient_plans(id);

ALTER TABLE public.discount_redemptions
  ADD CONSTRAINT discount_redemptions_subscription_id_fkey
  FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id);

ALTER TABLE public.discount_redemptions
  ADD CONSTRAINT discount_redemptions_redeemed_by_fkey
  FOREIGN KEY (redeemed_by) REFERENCES public.users(id);

ALTER TABLE public.clinic_wallets
  ADD CONSTRAINT clinic_wallets_clinic_id_fkey
  FOREIGN KEY (clinic_id) REFERENCES public.clinics(clinic_uuid);

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_wallet_id_fkey
  FOREIGN KEY (wallet_id) REFERENCES public.clinic_wallets(id);

ALTER TABLE public.app_developers
  ADD CONSTRAINT app_developers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.developer_wallets
  ADD CONSTRAINT developer_wallets_developer_id_fkey
  FOREIGN KEY (developer_id) REFERENCES public.app_developers(id);

ALTER TABLE public.developer_transactions
  ADD CONSTRAINT developer_transactions_wallet_id_fkey
  FOREIGN KEY (wallet_id) REFERENCES public.developer_wallets(id);

ALTER TABLE public.withdrawal_requests
  ADD CONSTRAINT withdrawal_requests_developer_id_fkey
  FOREIGN KEY (developer_id) REFERENCES public.app_developers(id);

ALTER TABLE public.withdrawal_requests
  ADD CONSTRAINT withdrawal_requests_wallet_id_fkey
  FOREIGN KEY (wallet_id) REFERENCES public.developer_wallets(id);

ALTER TABLE public.tabibi_apps
  ADD CONSTRAINT tabibi_apps_developer_id_fkey
  FOREIGN KEY (developer_id) REFERENCES public.app_developers(id);

ALTER TABLE public.app_requests
  ADD CONSTRAINT app_requests_developer_id_fkey
  FOREIGN KEY (developer_id) REFERENCES public.app_developers(id);

ALTER TABLE public.app_subscriptions
  ADD CONSTRAINT app_subscriptions_app_id_fkey
  FOREIGN KEY (app_id) REFERENCES public.tabibi_apps(id);

ALTER TABLE public.app_data_submissions
  ADD CONSTRAINT app_data_submissions_app_id_fkey
  FOREIGN KEY (app_id) REFERENCES public.tabibi_apps(id);

ALTER TABLE public.app_data_submissions
  ADD CONSTRAINT app_data_submissions_clinic_id_fkey
  FOREIGN KEY (clinic_id) REFERENCES public.clinics(clinic_uuid);

ALTER TABLE public.integrations
  ADD CONSTRAINT integrations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.fcm_tokens
  ADD CONSTRAINT fcm_tokens_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.daily_email_logs
  ADD CONSTRAINT daily_email_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.patient_attachments
  ADD CONSTRAINT patient_attachments_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id);

ALTER TABLE public.blocked_phones
  ADD CONSTRAINT blocked_phones_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.whatsapp_message_logs
  ADD CONSTRAINT whatsapp_message_logs_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id);

ALTER TABLE public.whatsapp_message_logs
  ADD CONSTRAINT whatsapp_message_logs_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);

ALTER TABLE public.chat_conversations
  ADD CONSTRAINT chat_conversations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;

ALTER TABLE public.tabibi_developers
  ADD CONSTRAINT tabibi_developers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.tabibi_marketplace_apps
  ADD CONSTRAINT tabibi_marketplace_apps_developer_id_fkey
  FOREIGN KEY (developer_id) REFERENCES public.tabibi_developers(id);

ALTER TABLE public.tabibi_app_versions
  ADD CONSTRAINT tabibi_app_versions_app_id_fkey
  FOREIGN KEY (app_id) REFERENCES public.tabibi_marketplace_apps(id) ON DELETE CASCADE;

ALTER TABLE public.tabibi_app_version_scopes
  ADD CONSTRAINT tabibi_app_version_scopes_version_id_fkey
  FOREIGN KEY (version_id) REFERENCES public.tabibi_app_versions(id) ON DELETE CASCADE;

ALTER TABLE public.tabibi_app_version_scopes
  ADD CONSTRAINT tabibi_app_version_scopes_scope_id_fkey
  FOREIGN KEY (scope_id) REFERENCES public.tabibi_app_scopes(id);

ALTER TABLE public.tabibi_app_schema_requests
  ADD CONSTRAINT tabibi_app_schema_requests_app_id_fkey
  FOREIGN KEY (app_id) REFERENCES public.tabibi_marketplace_apps(id);

ALTER TABLE public.tabibi_app_schema_requests
  ADD CONSTRAINT tabibi_app_schema_requests_developer_id_fkey
  FOREIGN KEY (developer_id) REFERENCES public.tabibi_developers(id);

ALTER TABLE public.tabibi_app_installations
  ADD CONSTRAINT tabibi_app_installations_app_id_fkey
  FOREIGN KEY (app_id) REFERENCES public.tabibi_marketplace_apps(id);

ALTER TABLE public.tabibi_app_installations
  ADD CONSTRAINT tabibi_app_installations_installed_version_id_fkey
  FOREIGN KEY (installed_version_id) REFERENCES public.tabibi_app_versions(id);

ALTER TABLE public.tabibi_app_reviews
  ADD CONSTRAINT tabibi_app_reviews_app_id_fkey
  FOREIGN KEY (app_id) REFERENCES public.tabibi_marketplace_apps(id);

ALTER TABLE public.tabibi_app_event_subscriptions
  ADD CONSTRAINT tabibi_app_event_subscriptions_app_id_fkey
  FOREIGN KEY (app_id) REFERENCES public.tabibi_marketplace_apps(id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transactions"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all transactions"
  ON public.transactions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_transactions_updated_at ON public.transactions;
CREATE TRIGGER handle_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON public.fcm_tokens;
DROP POLICY IF EXISTS "Users can view their own tokens" ON public.fcm_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON public.fcm_tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON public.fcm_tokens;
CREATE POLICY "Users can insert their own tokens" ON public.fcm_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own tokens" ON public.fcm_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own tokens" ON public.fcm_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tokens" ON public.fcm_tokens FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.chat_conversations;
CREATE POLICY "Users can view their own conversations" ON public.chat_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own conversations" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversations" ON public.chat_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own conversations" ON public.chat_conversations FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.chat_messages;
CREATE POLICY "Users can view messages from their conversations"
  ON public.chat_messages FOR SELECT
  USING (conversation_id IN (SELECT id FROM public.chat_conversations WHERE user_id = auth.uid()));
CREATE POLICY "Users can create messages in their conversations"
  ON public.chat_messages FOR INSERT
  WITH CHECK (conversation_id IN (SELECT id FROM public.chat_conversations WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.chat_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_conversation_on_message ON public.chat_messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_timestamp();

CREATE OR REPLACE FUNCTION public.generate_conversation_title()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'user' THEN
    UPDATE public.chat_conversations
    SET title = LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END
    WHERE id = NEW.conversation_id
      AND title = 'محادثة جديدة';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_generate_title ON public.chat_messages;
CREATE TRIGGER auto_generate_title
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_conversation_title();

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view whatsapp settings for their clinic" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "Users can update whatsapp settings for their clinic" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "Users can insert whatsapp settings for their clinic" ON public.whatsapp_settings;
CREATE POLICY "Users can view whatsapp settings for their clinic"
  ON public.whatsapp_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_uid = auth.uid()
      AND u.clinic_id = whatsapp_settings.clinic_id
    )
  );
CREATE POLICY "Users can update whatsapp settings for their clinic"
  ON public.whatsapp_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_uid = auth.uid()
      AND u.clinic_id = whatsapp_settings.clinic_id
    )
  );
CREATE POLICY "Users can insert whatsapp settings for their clinic"
  ON public.whatsapp_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_uid = auth.uid()
      AND u.clinic_id = whatsapp_settings.clinic_id
    )
  );

DROP POLICY IF EXISTS "Users can view whatsapp logs for their clinic" ON public.whatsapp_message_logs;
CREATE POLICY "Users can view whatsapp logs for their clinic"
  ON public.whatsapp_message_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_uid = auth.uid()
      AND u.clinic_id = whatsapp_message_logs.clinic_id
    )
  );

CREATE OR REPLACE FUNCTION public.get_due_whatsapp_reminders()
RETURNS TABLE (
  appointment_id bigint,
  clinic_id uuid,
  patient_id bigint,
  patient_name text,
  patient_phone text,
  appointment_date text,
  whatsapp_number text,
  reminder_time text,
  reminder_days_before integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.clinic_id,
    a.patient_id,
    p.name,
    p.phone,
    a.date,
    ws.whatsapp_number,
    ws.reminder_time,
    ws.reminder_days_before
  FROM public.appointments a
  JOIN public.patients p ON a.patient_id = p.id
  JOIN public.whatsapp_settings ws ON a.clinic_id = ws.clinic_id
  WHERE ws.enabled = true
    AND p.phone IS NOT NULL
    AND a.date IS NOT NULL
    AND a.status IS DISTINCT FROM 'cancelled'
    AND NOT EXISTS (
      SELECT 1 FROM public.whatsapp_message_logs l
      WHERE l.appointment_id = a.id
        AND l.message_type = 'reminder'
        AND l.status = 'sent'
    );
END;
$$;

ALTER TABLE public.booking_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_phones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public insert to analytics" ON public.booking_analytics;
DROP POLICY IF EXISTS "Clinics can view their own analytics" ON public.booking_analytics;
DROP POLICY IF EXISTS "Allow public insert/update drafts" ON public.booking_drafts;
DROP POLICY IF EXISTS "Clinics can view their drafts" ON public.booking_drafts;
DROP POLICY IF EXISTS "Clinics manage blocked phones" ON public.blocked_phones;
CREATE POLICY "Allow public insert to analytics" ON public.booking_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Clinics can view their own analytics" ON public.booking_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_uid = auth.uid()
      AND users.clinic_id = booking_analytics.clinic_id
    )
  );
CREATE POLICY "Allow public insert/update drafts" ON public.booking_drafts
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Clinics can view their drafts" ON public.booking_drafts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_uid = auth.uid()
      AND users.clinic_id = booking_drafts.clinic_id
    )
  );
CREATE POLICY "Clinics manage blocked phones" ON public.blocked_phones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_uid = auth.uid()
      AND users.clinic_id = blocked_phones.clinic_id
    )
  );

CREATE OR REPLACE FUNCTION public.check_is_blocked(check_phone text, check_clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blocked_phones
    WHERE clinic_id = check_clinic_id
      AND phone_number = check_phone
  );
END;
$$;

ALTER TABLE public.patient_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view attachments from their clinic" ON public.patient_attachments;
DROP POLICY IF EXISTS "Users can insert attachments for their clinic" ON public.patient_attachments;
DROP POLICY IF EXISTS "Users can update attachments for their clinic" ON public.patient_attachments;
DROP POLICY IF EXISTS "Users can delete attachments for their clinic" ON public.patient_attachments;
CREATE POLICY "Users can view attachments from their clinic"
  ON public.patient_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_uid = auth.uid()
      AND users.clinic_id = patient_attachments.clinic_id
    )
  );
CREATE POLICY "Users can insert attachments for their clinic"
  ON public.patient_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_uid = auth.uid()
      AND users.clinic_id = patient_attachments.clinic_id
    )
  );
CREATE POLICY "Users can update attachments for their clinic"
  ON public.patient_attachments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_uid = auth.uid()
      AND users.clinic_id = patient_attachments.clinic_id
    )
  );
CREATE POLICY "Users can delete attachments for their clinic"
  ON public.patient_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_uid = auth.uid()
      AND users.clinic_id = patient_attachments.clinic_id
    )
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-attachments', 'patient-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload patient attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update patient attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read patient attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete patient attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload patient attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'patient-attachments');
CREATE POLICY "Authenticated users can update patient attachments" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'patient-attachments');
CREATE POLICY "Authenticated users can read patient attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'patient-attachments');
CREATE POLICY "Authenticated users can delete patient attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'patient-attachments');

INSERT INTO storage.buckets (id, name, public)
VALUES ('doctor-profiles', 'doctor-profiles', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload doctor profiles" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update doctor profiles" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read doctor profiles" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete doctor profiles" ON storage.objects;
DROP POLICY IF EXISTS "Public can view doctor profiles" ON storage.objects;
CREATE POLICY "Authenticated users can upload doctor profiles" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'doctor-profiles');
CREATE POLICY "Authenticated users can update doctor profiles" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'doctor-profiles');
CREATE POLICY "Public can view doctor profiles" ON storage.objects FOR SELECT TO public USING (bucket_id = 'doctor-profiles');
CREATE POLICY "Authenticated users can delete doctor profiles" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'doctor-profiles');

CREATE OR REPLACE FUNCTION public.get_daily_appointments_for_email(p_clinic_id uuid, p_date text)
RETURNS TABLE (
  id bigint,
  patient_name text,
  patient_phone text,
  appointment_time text,
  status text,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    p.name,
    p.phone,
    a.date,
    a.status,
    a.notes
  FROM public.appointments a
  JOIN public.patients p ON a.patient_id = p.id
  WHERE a.clinic_id = p_clinic_id
    AND a.date LIKE p_date || '%'
    AND a.status IN ('confirmed','pending','scheduled')
  ORDER BY a.date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_appointments_for_email(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_appointments_for_email(uuid, text) TO service_role;

ALTER TABLE public.daily_email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own email logs" ON public.daily_email_logs;
DROP POLICY IF EXISTS "Service role can manage email logs" ON public.daily_email_logs;
CREATE POLICY "Users can view own email logs" ON public.daily_email_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage email logs" ON public.daily_email_logs FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE OR REPLACE FUNCTION public.increment_app_views(app_uuid bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tabibi_apps
  SET views_count = views_count + 1
  WHERE id = app_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  EXECUTE sql;
END;
$$;

ALTER TABLE public.tabibi_apps
  ADD COLUMN IF NOT EXISTS pricing_type text,
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS billing_interval_unit text,
  ADD COLUMN IF NOT EXISTS billing_interval_count integer,
  ADD COLUMN IF NOT EXISTS trial_interval_unit text,
  ADD COLUMN IF NOT EXISTS trial_interval_count integer,
  ADD COLUMN IF NOT EXISTS currency text;

DO $$
BEGIN
  ALTER TABLE public.tabibi_apps
    ADD CONSTRAINT tabibi_apps_pricing_type_check
    CHECK (pricing_type = ANY (ARRAY['free','paid','trial_then_paid']));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.tabibi_apps
    ADD CONSTRAINT tabibi_apps_payment_type_check
    CHECK (payment_type = ANY (ARRAY['one_time','recurring']));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.tabibi_apps
    ADD CONSTRAINT tabibi_apps_billing_interval_unit_check
    CHECK (billing_interval_unit = ANY (ARRAY['day','week','month','year']));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.tabibi_apps
    ADD CONSTRAINT tabibi_apps_billing_interval_count_check
    CHECK (billing_interval_count IS NULL OR billing_interval_count > 0);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.tabibi_apps
    ADD CONSTRAINT tabibi_apps_trial_interval_unit_check
    CHECK (trial_interval_unit IS NULL OR trial_interval_unit = ANY (ARRAY['day','week','month','year']));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.tabibi_apps
    ADD CONSTRAINT tabibi_apps_trial_interval_count_check
    CHECK (trial_interval_count IS NULL OR trial_interval_count > 0);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

UPDATE public.tabibi_apps
SET
  pricing_type = COALESCE(pricing_type, CASE WHEN COALESCE(price, 0) > 0 THEN 'paid' ELSE 'free' END),
  payment_type = COALESCE(payment_type, CASE WHEN billing_period = 'one_time' THEN 'one_time' ELSE 'recurring' END),
  billing_interval_unit = COALESCE(billing_interval_unit, CASE WHEN billing_period = 'yearly' THEN 'year' ELSE 'month' END),
  billing_interval_count = COALESCE(billing_interval_count, 1),
  currency = COALESCE(currency, 'EGP');

UPDATE public.app_subscriptions s
SET
  pricing_type = COALESCE(s.pricing_type, CASE WHEN COALESCE(a.price, 0) > 0 THEN 'paid' ELSE 'free' END),
  payment_type = COALESCE(s.payment_type, CASE WHEN a.billing_period = 'one_time' THEN 'one_time' ELSE 'recurring' END),
  interval_unit = COALESCE(s.interval_unit, CASE WHEN a.billing_period = 'yearly' THEN 'year' ELSE 'month' END),
  interval_count = COALESCE(s.interval_count, 1),
  currency = COALESCE(s.currency, 'EGP')
FROM public.tabibi_apps a
WHERE a.id = s.app_id;

CREATE OR REPLACE FUNCTION public.subscribe_app_with_wallet(p_clinic_id uuid, p_app_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id uuid;
  v_balance numeric;
  v_app_price numeric;
  v_app_title text;
  v_app_billing_period text;
  v_app_developer_id uuid;
  v_pricing_type text;
  v_payment_type text;
  v_interval_unit text;
  v_interval_count integer;
  v_trial_unit text;
  v_trial_count integer;
  v_currency text;
  v_subscription_id bigint;
  v_existing_trial_end timestamptz;
  v_period_end timestamptz;
  v_trial_end timestamptz;
  v_charge numeric;
  v_dev_wallet_id uuid;
  v_dev_share numeric;
  v_billing_label text;
BEGIN
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM public.clinic_wallets
  WHERE clinic_id = p_clinic_id;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for this clinic';
  END IF;

  SELECT
    price,
    title,
    billing_period,
    developer_id,
    COALESCE(pricing_type, CASE WHEN COALESCE(price, 0) > 0 THEN 'paid' ELSE 'free' END),
    COALESCE(payment_type, CASE WHEN billing_period = 'one_time' THEN 'one_time' ELSE 'recurring' END),
    COALESCE(billing_interval_unit, CASE WHEN billing_period = 'yearly' THEN 'year' ELSE 'month' END),
    COALESCE(billing_interval_count, 1),
    COALESCE(trial_interval_unit, 'day'),
    COALESCE(trial_interval_count, 7),
    COALESCE(currency, 'EGP')
  INTO
    v_app_price,
    v_app_title,
    v_app_billing_period,
    v_app_developer_id,
    v_pricing_type,
    v_payment_type,
    v_interval_unit,
    v_interval_count,
    v_trial_unit,
    v_trial_count,
    v_currency
  FROM public.tabibi_apps
  WHERE id = p_app_id;

  IF v_app_title IS NULL THEN
    RAISE EXCEPTION 'App not found';
  END IF;

  SELECT id, trial_end INTO v_subscription_id, v_existing_trial_end
  FROM public.app_subscriptions
  WHERE clinic_id = p_clinic_id AND app_id = p_app_id;

  IF v_payment_type = 'one_time' THEN
    v_period_end := NULL;
  ELSE
    v_period_end := now();
  END IF;

  v_trial_end := NULL;

  IF v_pricing_type = 'free' THEN
    v_charge := 0;
    v_period_end := NULL;
  ELSIF v_pricing_type = 'trial_then_paid' AND (v_subscription_id IS NULL OR v_existing_trial_end IS NULL) THEN
    v_charge := 0;
    v_period_end := now() + (v_trial_count::text || ' ' || v_trial_unit || 's')::interval;
    v_trial_end := v_period_end;
  ELSE
    v_charge := COALESCE(v_app_price, 0);
    IF v_payment_type = 'recurring' THEN
      v_period_end := now() + (v_interval_count::text || ' ' || v_interval_unit || 's')::interval;
    ELSE
      v_period_end := NULL;
    END IF;
  END IF;

  IF v_charge > 0 AND v_balance < v_charge THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  IF v_charge > 0 THEN
    UPDATE public.clinic_wallets
    SET balance = balance - v_charge, updated_at = now()
    WHERE id = v_wallet_id;

    INSERT INTO public.wallet_transactions (wallet_id, amount, type, description, reference_id, reference_type, status)
    VALUES (v_wallet_id, -v_charge, 'payment', 'اشتراك في تطبيق: ' || v_app_title, p_app_id::text, 'app_purchase', 'completed');

    IF v_app_developer_id IS NOT NULL THEN
      v_dev_share := v_charge * 0.70;

      SELECT id INTO v_dev_wallet_id
      FROM public.developer_wallets
      WHERE developer_id = v_app_developer_id;

      IF v_dev_wallet_id IS NULL THEN
        INSERT INTO public.developer_wallets (developer_id, balance, currency)
        VALUES (v_app_developer_id, 0, v_currency)
        RETURNING id INTO v_dev_wallet_id;
      END IF;

      UPDATE public.developer_wallets
      SET balance = balance + v_dev_share, updated_at = now()
      WHERE id = v_dev_wallet_id;

      INSERT INTO public.developer_transactions (wallet_id, amount, type, description, reference_id, reference_type, status)
      VALUES (v_dev_wallet_id, v_dev_share, 'earning', 'إيراد من تطبيق: ' || v_app_title, p_app_id::text, 'app_earning', 'completed');
    END IF;
  END IF;

  IF v_subscription_id IS NULL THEN
    INSERT INTO public.app_subscriptions (
      clinic_id, app_id, status, current_period_start, current_period_end, billing_period, amount,
      pricing_type, payment_type, interval_unit, interval_count, trial_interval_unit, trial_interval_count, trial_end, currency
    ) VALUES (
      p_clinic_id, p_app_id, 'active', now(), v_period_end, v_app_billing_period, v_charge,
      v_pricing_type, v_payment_type, v_interval_unit, v_interval_count, v_trial_unit, v_trial_count, v_trial_end, v_currency
    )
    RETURNING id INTO v_subscription_id;
  ELSE
    UPDATE public.app_subscriptions
    SET
      status = 'active',
      updated_at = now(),
      current_period_start = now(),
      current_period_end = v_period_end,
      billing_period = v_app_billing_period,
      amount = v_charge,
      pricing_type = v_pricing_type,
      payment_type = v_payment_type,
      interval_unit = v_interval_unit,
      interval_count = v_interval_count,
      trial_interval_unit = v_trial_unit,
      trial_interval_count = v_trial_count,
      trial_end = COALESCE(app_subscriptions.trial_end, v_trial_end),
      currency = v_currency
    WHERE id = v_subscription_id;
  END IF;

  v_billing_label := CASE
    WHEN v_pricing_type = 'free' THEN 'مجاني'
    WHEN v_pricing_type = 'trial_then_paid' AND v_charge = 0 THEN 'تجربة مجانية'
    WHEN v_payment_type = 'one_time' THEN 'مرة واحدة'
    ELSE 'متجدد'
  END;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'charged', v_charge,
    'currency', v_currency,
    'billing', v_billing_label,
    'period_end', v_period_end,
    'trial_end', v_trial_end
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_visit_insert_for_plan()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan record;
  v_template record;
  v_clinic record;
  v_new_completed integer;
  v_total integer;
  v_mode text;
  v_bundle_size integer;
  v_bundle_price numeric;
  v_session_price numeric;
  v_charge_amount numeric;
  v_reference_key text;
  v_description text;
  v_clinic_id_bigint bigint;
BEGIN
  IF NEW.patient_plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, clinic_id, template_id, total_sessions, completed_sessions, status, advanced_settings
  INTO v_plan
  FROM public.patient_plans
  WHERE id = NEW.patient_plan_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF v_plan.status IS NOT NULL AND v_plan.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  v_total := COALESCE(v_plan.total_sessions, 0);
  v_new_completed := COALESCE(v_plan.completed_sessions, 0) + 1;

  UPDATE public.patient_plans
  SET
    completed_sessions = v_new_completed,
    status = CASE
      WHEN v_total > 0 AND v_new_completed >= v_total THEN 'completed'
      ELSE COALESCE(status, 'active')
    END,
    updated_at = now()
  WHERE id = v_plan.id;

  SELECT id, clinic_id_bigint
  INTO v_clinic
  FROM public.clinics
  WHERE clinic_uuid = NEW.clinic_id
  LIMIT 1;

  v_clinic_id_bigint := COALESCE(v_clinic.clinic_id_bigint, v_clinic.id);
  IF v_clinic_id_bigint IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, session_price, name
  INTO v_template
  FROM public.treatment_templates
  WHERE id = v_plan.template_id
  LIMIT 1;

  v_session_price := COALESCE(v_template.session_price, 0);
  v_mode := COALESCE(v_plan.advanced_settings->'billing'->>'mode', 'per_session');

  IF v_mode = 'bundle' THEN
    v_bundle_size := NULLIF((v_plan.advanced_settings->'billing'->>'bundleSize')::int, 0);
    v_bundle_price := NULLIF((v_plan.advanced_settings->'billing'->>'bundlePrice')::numeric, 0);
    IF v_bundle_size IS NULL OR v_bundle_price IS NULL THEN
      RETURN NEW;
    END IF;
    IF v_new_completed % v_bundle_size <> 0 THEN
      RETURN NEW;
    END IF;
    v_charge_amount := v_bundle_price;
    v_reference_key := 'plan:' || v_plan.id::text || ':bundle:' || (v_new_completed / v_bundle_size)::text;
    v_description := 'مستحقات باقة جلسات - ' || COALESCE(v_template.name, 'خطة علاجية');
  ELSE
    v_charge_amount := v_session_price;
    v_reference_key := 'plan:' || v_plan.id::text || ':session:' || v_new_completed::text;
    v_description := 'مستحقات جلسة علاجية - ' || COALESCE(v_template.name, 'خطة علاجية');
  END IF;

  IF v_charge_amount IS NULL OR v_charge_amount <= 0 THEN
    RETURN NEW;
  END IF;

  IF v_reference_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.financial_records fr
      WHERE fr.clinic_id = v_clinic_id_bigint
        AND fr.reference_key = v_reference_key
      LIMIT 1
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.financial_records (
      clinic_id,
      patient_id,
      patient_plan_id,
      visit_id,
      amount,
      type,
      description,
      reference_key,
      recorded_at
    ) VALUES (
      v_clinic_id_bigint,
      NEW.patient_id,
      v_plan.id,
      NEW.id,
      v_charge_amount,
      'charge',
      v_description,
      v_reference_key,
      COALESCE(NEW.created_at, now())
    );
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS visits_after_insert_plan_trigger ON public.visits;
CREATE TRIGGER visits_after_insert_plan_trigger
  AFTER INSERT ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_visit_insert_for_plan();

CREATE OR REPLACE FUNCTION public.handle_new_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  patient_name text;
BEGIN
  IF NEW.patient_id IS NOT NULL THEN
    SELECT name INTO patient_name FROM public.patients WHERE id = NEW.patient_id;
  END IF;

  INSERT INTO public.notifications (
    clinic_id, type, title, message, appointment_id, patient_id, related_id, is_read, created_at, updated_at
  ) VALUES (
    NEW.clinic_id,
    'appointment',
    'حجز جديد',
    CASE
      WHEN patient_name IS NOT NULL THEN 'حجز جديد من المريض: ' || patient_name
      ELSE 'حجز جديد تم إضافته'
    END,
    NEW.id,
    NEW.patient_id,
    NEW.id::text,
    false,
    now(),
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_appointment ON public.appointments;
CREATE TRIGGER on_new_appointment
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_appointment();

COMMIT;
