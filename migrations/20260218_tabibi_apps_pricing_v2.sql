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

ALTER TABLE public.app_subscriptions
ADD COLUMN IF NOT EXISTS pricing_type text,
ADD COLUMN IF NOT EXISTS payment_type text,
ADD COLUMN IF NOT EXISTS interval_unit text,
ADD COLUMN IF NOT EXISTS interval_count integer,
ADD COLUMN IF NOT EXISTS trial_interval_unit text,
ADD COLUMN IF NOT EXISTS trial_interval_count integer,
ADD COLUMN IF NOT EXISTS trial_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS currency text;

DO $$
BEGIN
  ALTER TABLE public.app_subscriptions
    ADD CONSTRAINT app_subscriptions_pricing_type_check
    CHECK (pricing_type IS NULL OR pricing_type = ANY (ARRAY['free','paid','trial_then_paid']));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.app_subscriptions
    ADD CONSTRAINT app_subscriptions_payment_type_check
    CHECK (payment_type IS NULL OR payment_type = ANY (ARRAY['one_time','recurring']));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.app_subscriptions
    ADD CONSTRAINT app_subscriptions_interval_unit_check
    CHECK (interval_unit IS NULL OR interval_unit = ANY (ARRAY['day','week','month','year']));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.app_subscriptions
    ADD CONSTRAINT app_subscriptions_interval_count_check
    CHECK (interval_count IS NULL OR interval_count > 0);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

UPDATE public.app_subscriptions s
SET
  pricing_type = COALESCE(s.pricing_type, CASE WHEN COALESCE(a.price, 0) > 0 THEN 'paid' ELSE 'free' END),
  payment_type = COALESCE(s.payment_type, CASE WHEN a.billing_period = 'one_time' THEN 'one_time' ELSE 'recurring' END),
  interval_unit = COALESCE(s.interval_unit, CASE WHEN a.billing_period = 'yearly' THEN 'year' ELSE 'month' END),
  interval_count = COALESCE(s.interval_count, 1),
  currency = COALESCE(s.currency, 'EGP')
FROM public.tabibi_apps a
WHERE a.id = s.app_id;

CREATE OR REPLACE FUNCTION public.subscribe_app_with_wallet(
    p_clinic_id uuid,
    p_app_id bigint
)
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
    v_existing_trial_end timestamp with time zone;
    v_period_end timestamp with time zone;
    v_trial_end timestamp with time zone;
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
      SET balance = balance - v_charge,
          updated_at = now()
      WHERE id = v_wallet_id;

      INSERT INTO public.wallet_transactions (
          wallet_id,
          amount,
          type,
          description,
          reference_id,
          reference_type,
          status
      ) VALUES (
          v_wallet_id,
          -v_charge,
          'payment',
          'اشتراك في تطبيق: ' || v_app_title,
          p_app_id::text,
          'app_purchase',
          'completed'
      );

      IF v_app_developer_id IS NOT NULL THEN
          v_dev_share := v_charge * 0.70;

          SELECT id INTO v_dev_wallet_id
          FROM public.developer_wallets
          WHERE developer_id = v_app_developer_id;

          IF v_dev_wallet_id IS NULL THEN
              INSERT INTO public.developer_wallets (developer_id, balance)
              VALUES (v_app_developer_id, 0)
              RETURNING id INTO v_dev_wallet_id;
          END IF;

          UPDATE public.developer_wallets
          SET balance = balance + v_dev_share,
              updated_at = now()
          WHERE id = v_dev_wallet_id;

          INSERT INTO public.developer_transactions (
              wallet_id,
              amount,
              type,
              description,
              reference_id,
              reference_type,
              status
          ) VALUES (
              v_dev_wallet_id,
              v_dev_share,
              'earning',
              'Revenue share from app subscription: ' || v_app_title,
              p_app_id::text,
              'app_subscription',
              'completed'
          );
      END IF;
    END IF;

    IF v_payment_type = 'one_time' THEN
      v_billing_label := 'one_time';
    ELSIF v_interval_unit = 'month' AND COALESCE(v_interval_count, 1) = 1 THEN
      v_billing_label := 'monthly';
    ELSIF v_interval_unit = 'year' AND COALESCE(v_interval_count, 1) = 1 THEN
      v_billing_label := 'yearly';
    ELSE
      v_billing_label := 'custom';
    END IF;

    IF v_subscription_id IS NOT NULL THEN
        UPDATE public.app_subscriptions
        SET status = 'active',
            current_period_start = now(),
            current_period_end = v_period_end,
            amount = v_charge,
            billing_period = v_billing_label,
            pricing_type = v_pricing_type,
            payment_type = v_payment_type,
            interval_unit = v_interval_unit,
            interval_count = v_interval_count,
            trial_interval_unit = CASE WHEN v_pricing_type = 'trial_then_paid' THEN v_trial_unit ELSE NULL END,
            trial_interval_count = CASE WHEN v_pricing_type = 'trial_then_paid' THEN v_trial_count ELSE NULL END,
            trial_end = COALESCE(v_trial_end, trial_end),
            currency = v_currency,
            auto_renew = (v_payment_type = 'recurring'),
            updated_at = now()
        WHERE id = v_subscription_id;
    ELSE
        INSERT INTO public.app_subscriptions (
            clinic_id,
            app_id,
            status,
            current_period_start,
            current_period_end,
            amount,
            billing_period,
            auto_renew,
            pricing_type,
            payment_type,
            interval_unit,
            interval_count,
            trial_interval_unit,
            trial_interval_count,
            trial_end,
            currency
        ) VALUES (
            p_clinic_id,
            p_app_id,
            'active',
            now(),
            v_period_end,
            v_charge,
            v_billing_label,
            (v_payment_type = 'recurring'),
            v_pricing_type,
            v_payment_type,
            v_interval_unit,
            v_interval_count,
            CASE WHEN v_pricing_type = 'trial_then_paid' THEN v_trial_unit ELSE NULL END,
            CASE WHEN v_pricing_type = 'trial_then_paid' THEN v_trial_count ELSE NULL END,
            v_trial_end,
            v_currency
        )
        RETURNING id INTO v_subscription_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'subscription_id', v_subscription_id,
        'new_balance', v_balance - v_charge
    );
END;
$$;

