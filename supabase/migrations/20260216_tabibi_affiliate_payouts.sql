CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.affiliate_payout_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES public.affiliate_users(user_id) ON DELETE CASCADE,
  payout_method text NOT NULL DEFAULT 'bank' CHECK (payout_method IN ('bank','wallet')),
  bank_name text,
  account_name text,
  iban text,
  wallet_phone text,
  notes text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_payment_settings (
  affiliate_user_id uuid PRIMARY KEY REFERENCES public.affiliate_users(user_id) ON DELETE CASCADE,
  payout_method text NOT NULL DEFAULT 'bank' CHECK (payout_method IN ('bank','wallet')),
  bank_name text,
  account_name text,
  iban text,
  wallet_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES public.affiliate_users(user_id) ON DELETE CASCADE,
  payout_method_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_withdrawal_requests
  ADD COLUMN IF NOT EXISTS payout_method_id uuid;

ALTER TABLE public.affiliate_withdrawal_requests
  DROP CONSTRAINT IF EXISTS affiliate_withdrawal_requests_payout_method_id_fkey;

ALTER TABLE public.affiliate_withdrawal_requests
  ADD CONSTRAINT affiliate_withdrawal_requests_payout_method_id_fkey
  FOREIGN KEY (payout_method_id)
  REFERENCES public.affiliate_payout_methods(id)
  ON DELETE SET NULL;

ALTER TABLE public.affiliate_commissions
  DROP CONSTRAINT IF EXISTS affiliate_commissions_withdrawal_request_id_fkey;

DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'affiliate_commissions'
    AND column_name = 'withdrawal_request_id';

  IF col_type IS NOT NULL AND col_type <> 'uuid' THEN
    EXECUTE 'ALTER TABLE public.affiliate_commissions DROP COLUMN withdrawal_request_id';
  END IF;
END;
$$;

ALTER TABLE public.affiliate_commissions
  ADD COLUMN IF NOT EXISTS withdrawal_request_id uuid;

ALTER TABLE public.affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_withdrawal_request_id_fkey
  FOREIGN KEY (withdrawal_request_id)
  REFERENCES public.affiliate_withdrawal_requests(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_withdrawal_request_id
  ON public.affiliate_commissions(withdrawal_request_id);

ALTER TABLE public.affiliate_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payout_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_payment_settings_select_own" ON public.affiliate_payment_settings;
CREATE POLICY "affiliate_payment_settings_select_own"
  ON public.affiliate_payment_settings
  FOR SELECT
  USING (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "affiliate_payment_settings_insert_own" ON public.affiliate_payment_settings;
CREATE POLICY "affiliate_payment_settings_insert_own"
  ON public.affiliate_payment_settings
  FOR INSERT
  WITH CHECK (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "affiliate_payment_settings_update_own" ON public.affiliate_payment_settings;
CREATE POLICY "affiliate_payment_settings_update_own"
  ON public.affiliate_payment_settings
  FOR UPDATE
  USING (auth.uid() = affiliate_user_id)
  WITH CHECK (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "affiliate_withdrawal_requests_select_own" ON public.affiliate_withdrawal_requests;
CREATE POLICY "affiliate_withdrawal_requests_select_own"
  ON public.affiliate_withdrawal_requests
  FOR SELECT
  USING (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "affiliate_withdrawal_requests_insert_own" ON public.affiliate_withdrawal_requests;
CREATE POLICY "affiliate_withdrawal_requests_insert_own"
  ON public.affiliate_withdrawal_requests
  FOR INSERT
  WITH CHECK (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "affiliate_payout_methods_select_own" ON public.affiliate_payout_methods;
CREATE POLICY "affiliate_payout_methods_select_own"
  ON public.affiliate_payout_methods
  FOR SELECT
  USING (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "affiliate_payout_methods_insert_own" ON public.affiliate_payout_methods;
CREATE POLICY "affiliate_payout_methods_insert_own"
  ON public.affiliate_payout_methods
  FOR INSERT
  WITH CHECK (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "affiliate_payout_methods_update_own" ON public.affiliate_payout_methods;
CREATE POLICY "affiliate_payout_methods_update_own"
  ON public.affiliate_payout_methods
  FOR UPDATE
  USING (auth.uid() = affiliate_user_id)
  WITH CHECK (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "affiliate_payout_methods_delete_own" ON public.affiliate_payout_methods;
CREATE POLICY "affiliate_payout_methods_delete_own"
  ON public.affiliate_payout_methods
  FOR DELETE
  USING (auth.uid() = affiliate_user_id);

DROP FUNCTION IF EXISTS public.upsert_affiliate_payment_settings(text, text, text, text, text, text) CASCADE;
CREATE OR REPLACE FUNCTION public.upsert_affiliate_payment_settings(
  payout_method text,
  bank_name text,
  account_name text,
  iban text,
  wallet_phone text,
  notes text
)
RETURNS public.affiliate_payment_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  row public.affiliate_payment_settings;
  payout_id uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.affiliate_payment_settings (
    affiliate_user_id,
    payout_method,
    bank_name,
    account_name,
    iban,
    wallet_phone,
    notes,
    updated_at
  ) VALUES (
    uid,
    COALESCE(upsert_affiliate_payment_settings.payout_method, 'bank'),
    upsert_affiliate_payment_settings.bank_name,
    upsert_affiliate_payment_settings.account_name,
    upsert_affiliate_payment_settings.iban,
    upsert_affiliate_payment_settings.wallet_phone,
    upsert_affiliate_payment_settings.notes,
    now()
  )
  ON CONFLICT (affiliate_user_id) DO UPDATE SET
    payout_method = EXCLUDED.payout_method,
    bank_name = EXCLUDED.bank_name,
    account_name = EXCLUDED.account_name,
    iban = EXCLUDED.iban,
    wallet_phone = EXCLUDED.wallet_phone,
    notes = EXCLUDED.notes,
    updated_at = now()
  RETURNING * INTO row;

  SELECT m.id INTO payout_id
  FROM public.affiliate_payout_methods m
  WHERE m.affiliate_user_id = uid
    AND m.is_default = true
  ORDER BY m.created_at DESC
  LIMIT 1;

  IF payout_id IS NULL THEN
    INSERT INTO public.affiliate_payout_methods (
      affiliate_user_id,
      payout_method,
      bank_name,
      account_name,
      iban,
      wallet_phone,
      notes,
      is_default,
      updated_at
    ) VALUES (
      uid,
      COALESCE(upsert_affiliate_payment_settings.payout_method, 'bank'),
      upsert_affiliate_payment_settings.bank_name,
      upsert_affiliate_payment_settings.account_name,
      upsert_affiliate_payment_settings.iban,
      upsert_affiliate_payment_settings.wallet_phone,
      upsert_affiliate_payment_settings.notes,
      true,
      now()
    ) RETURNING id INTO payout_id;
  ELSE
    UPDATE public.affiliate_payout_methods
    SET payout_method = COALESCE(upsert_affiliate_payment_settings.payout_method, payout_method),
        bank_name = upsert_affiliate_payment_settings.bank_name,
        account_name = upsert_affiliate_payment_settings.account_name,
        iban = upsert_affiliate_payment_settings.iban,
        wallet_phone = upsert_affiliate_payment_settings.wallet_phone,
        notes = upsert_affiliate_payment_settings.notes,
        updated_at = now()
    WHERE id = payout_id
      AND affiliate_user_id = uid;
  END IF;

  UPDATE public.affiliate_payout_methods
  SET is_default = false,
      updated_at = now()
  WHERE affiliate_user_id = uid
    AND id <> payout_id
    AND is_default = true;

  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_affiliate_payment_settings(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_affiliate_payment_settings(text, text, text, text, text, text) TO authenticated;

DROP FUNCTION IF EXISTS public.upsert_affiliate_payout_method(uuid, text, text, text, text, text, text, boolean) CASCADE;
CREATE OR REPLACE FUNCTION public.upsert_affiliate_payout_method(
  payout_method_id uuid,
  payout_method text,
  bank_name text,
  account_name text,
  iban text,
  wallet_phone text,
  notes text,
  make_default boolean
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
    SELECT 1 FROM public.affiliate_payout_methods m WHERE m.affiliate_user_id = uid AND m.is_default = true
  ) INTO exists_default;

  IF upsert_affiliate_payout_method.payout_method_id IS NULL THEN
    INSERT INTO public.affiliate_payout_methods (
      affiliate_user_id,
      payout_method,
      bank_name,
      account_name,
      iban,
      wallet_phone,
      notes,
      is_default,
      updated_at
    ) VALUES (
      uid,
      COALESCE(upsert_affiliate_payout_method.payout_method, 'bank'),
      upsert_affiliate_payout_method.bank_name,
      upsert_affiliate_payout_method.account_name,
      upsert_affiliate_payout_method.iban,
      upsert_affiliate_payout_method.wallet_phone,
      upsert_affiliate_payout_method.notes,
      false,
      now()
    ) RETURNING * INTO row;
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
    RAISE EXCEPTION 'payout_method_not_found';
  END IF;

  IF COALESCE(upsert_affiliate_payout_method.make_default, false) = true OR exists_default = false THEN
    UPDATE public.affiliate_payout_methods
    SET is_default = false,
        updated_at = now()
    WHERE affiliate_user_id = uid
      AND id <> row.id
      AND is_default = true;

    UPDATE public.affiliate_payout_methods
    SET is_default = true,
        updated_at = now()
    WHERE affiliate_user_id = uid
      AND id = row.id;

    SELECT * INTO row FROM public.affiliate_payout_methods WHERE id = row.id;
  END IF;

  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_affiliate_payout_method(uuid, text, text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_affiliate_payout_method(uuid, text, text, text, text, text, text, boolean) TO authenticated;

DROP FUNCTION IF EXISTS public.set_default_affiliate_payout_method(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.set_default_affiliate_payout_method(
  payout_method_id uuid
)
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

  IF NOT EXISTS (
    SELECT 1 FROM public.affiliate_payout_methods m
    WHERE m.id = set_default_affiliate_payout_method.payout_method_id
      AND m.affiliate_user_id = uid
  ) THEN
    RAISE EXCEPTION 'payout_method_not_found';
  END IF;

  UPDATE public.affiliate_payout_methods
  SET is_default = false,
      updated_at = now()
  WHERE affiliate_user_id = uid
    AND is_default = true;

  UPDATE public.affiliate_payout_methods
  SET is_default = true,
      updated_at = now()
  WHERE affiliate_user_id = uid
    AND id = set_default_affiliate_payout_method.payout_method_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_default_affiliate_payout_method(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_default_affiliate_payout_method(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.delete_affiliate_payout_method(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.delete_affiliate_payout_method(
  payout_method_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  was_default boolean;
  next_default uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT m.is_default INTO was_default
  FROM public.affiliate_payout_methods m
  WHERE m.id = delete_affiliate_payout_method.payout_method_id
    AND m.affiliate_user_id = uid
  LIMIT 1;

  IF was_default IS NULL THEN
    RAISE EXCEPTION 'payout_method_not_found';
  END IF;

  DELETE FROM public.affiliate_payout_methods m
  WHERE m.id = delete_affiliate_payout_method.payout_method_id
    AND m.affiliate_user_id = uid;

  IF was_default = true THEN
    SELECT m.id INTO next_default
    FROM public.affiliate_payout_methods m
    WHERE m.affiliate_user_id = uid
    ORDER BY m.created_at DESC
    LIMIT 1;

    IF next_default IS NOT NULL THEN
      UPDATE public.affiliate_payout_methods
      SET is_default = true,
          updated_at = now()
      WHERE id = next_default
        AND affiliate_user_id = uid;
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
  amount numeric;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT COALESCE(sum(c.commission_amount), 0) INTO amount
  FROM public.affiliate_commissions c
  WHERE c.affiliate_user_id = uid
    AND c.status <> 'void'
    AND (
      c.status IN ('approved','paid')
      OR (c.status = 'pending' AND c.available_at <= now())
    )
    AND c.withdrawal_request_id IS NULL;

  RETURN COALESCE(amount, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_affiliate_withdrawable_balance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_affiliate_withdrawable_balance() TO authenticated;

DROP FUNCTION IF EXISTS public.request_affiliate_withdrawal() CASCADE;
CREATE OR REPLACE FUNCTION public.request_affiliate_withdrawal()
RETURNS public.affiliate_withdrawal_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  amount numeric;
  req public.affiliate_withdrawal_requests;
  payout_id uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT m.id INTO payout_id
  FROM public.affiliate_payout_methods m
  WHERE m.affiliate_user_id = uid
  ORDER BY m.is_default DESC, m.created_at DESC
  LIMIT 1;

  IF payout_id IS NULL THEN
    RAISE EXCEPTION 'missing_payment_settings';
  END IF;

  amount := public.get_affiliate_withdrawable_balance();
  IF COALESCE(amount, 0) <= 0 THEN
    RAISE EXCEPTION 'no_withdrawable_balance';
  END IF;

  INSERT INTO public.affiliate_withdrawal_requests (affiliate_user_id, payout_method_id, amount, status, created_at, updated_at)
  VALUES (uid, payout_id, amount, 'pending', now(), now())
  RETURNING * INTO req;

  UPDATE public.affiliate_commissions c
  SET withdrawal_request_id = req.id
  WHERE c.affiliate_user_id = uid
    AND c.status <> 'void'
    AND (
      c.status IN ('approved','paid')
      OR (c.status = 'pending' AND c.available_at <= now())
    )
    AND c.withdrawal_request_id IS NULL;

  RETURN req;
END;
$$;

REVOKE ALL ON FUNCTION public.request_affiliate_withdrawal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_affiliate_withdrawal() TO authenticated;
