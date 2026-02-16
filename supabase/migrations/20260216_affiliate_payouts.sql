CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.affiliate_payment_settings (
  affiliate_user_id uuid PRIMARY KEY REFERENCES public.affiliate_users(user_id) ON DELETE CASCADE,
  payout_method text NOT NULL DEFAULT 'bank' CHECK (payout_method IN ('bank', 'wallet')),
  bank_name text,
  account_name text,
  iban text,
  wallet_phone text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_withdrawal_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES public.affiliate_users(user_id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  payout_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_withdrawal_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.affiliate_withdrawal_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.affiliate_withdrawal_requests(id) ON DELETE CASCADE,
  commission_id bigint NOT NULL REFERENCES public.affiliate_commissions(id) ON DELETE CASCADE,
  UNIQUE (commission_id)
);

ALTER TABLE public.affiliate_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_withdrawal_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_payment_settings_select_own" ON public.affiliate_payment_settings;
CREATE POLICY "affiliate_payment_settings_select_own"
  ON public.affiliate_payment_settings
  FOR SELECT
  USING (auth.uid() = affiliate_user_id);

DROP POLICY IF EXISTS "affiliate_payment_settings_upsert_own" ON public.affiliate_payment_settings;
CREATE POLICY "affiliate_payment_settings_upsert_own"
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

DROP POLICY IF EXISTS "affiliate_withdrawal_items_select_own" ON public.affiliate_withdrawal_items;
CREATE POLICY "affiliate_withdrawal_items_select_own"
  ON public.affiliate_withdrawal_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.affiliate_withdrawal_requests r
      WHERE r.id = affiliate_withdrawal_items.request_id
        AND r.affiliate_user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.get_affiliate_withdrawable_balance()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  total numeric;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT COALESCE(sum(c.commission_amount), 0) INTO total
  FROM public.affiliate_commissions c
  WHERE c.affiliate_user_id = uid
    AND c.status = 'pending'
    AND c.available_at <= now()
    AND NOT EXISTS (
      SELECT 1
      FROM public.affiliate_withdrawal_items i
      JOIN public.affiliate_withdrawal_requests r ON r.id = i.request_id
      WHERE i.commission_id = c.id
        AND r.status IN ('pending', 'approved')
    );

  RETURN total;
END;
$$;

REVOKE ALL ON FUNCTION public.get_affiliate_withdrawable_balance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_affiliate_withdrawable_balance() TO authenticated;

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
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.affiliate_payment_settings (
    affiliate_user_id, payout_method, bank_name, account_name, iban, wallet_phone, notes, updated_at
  ) VALUES (
    uid, payout_method, bank_name, account_name, iban, wallet_phone, notes, now()
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

  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_affiliate_payment_settings(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_affiliate_payment_settings(text, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_affiliate_withdrawal()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  available numeric;
  req_id uuid;
  payout public.affiliate_payment_settings;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO payout FROM public.affiliate_payment_settings WHERE affiliate_user_id = uid;
  IF payout.affiliate_user_id IS NULL THEN
    RAISE EXCEPTION 'missing_payment_settings';
  END IF;

  available := public.get_affiliate_withdrawable_balance();
  IF available <= 0 THEN
    RAISE EXCEPTION 'no_withdrawable_balance';
  END IF;

  INSERT INTO public.affiliate_withdrawal_requests (affiliate_user_id, amount, status, payout_snapshot)
  VALUES (uid, available, 'pending', to_jsonb(payout))
  RETURNING id INTO req_id;

  INSERT INTO public.affiliate_withdrawal_items (request_id, commission_id)
  SELECT req_id, c.id
  FROM public.affiliate_commissions c
  WHERE c.affiliate_user_id = uid
    AND c.status = 'pending'
    AND c.available_at <= now()
    AND NOT EXISTS (
      SELECT 1
      FROM public.affiliate_withdrawal_items i
      JOIN public.affiliate_withdrawal_requests r ON r.id = i.request_id
      WHERE i.commission_id = c.id
        AND r.status IN ('pending', 'approved')
    )
  ORDER BY c.created_at ASC;

  RETURN req_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_affiliate_withdrawal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_affiliate_withdrawal() TO authenticated;

