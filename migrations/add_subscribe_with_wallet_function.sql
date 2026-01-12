-- Create wallet_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    wallet_id uuid NOT NULL,
    amount numeric NOT NULL,
    type text NOT NULL CHECK (type = ANY (ARRAY['deposit'::text, 'payment'::text, 'refund'::text, 'adjustment'::text, 'bonus'::text])),
    description text,
    reference_id text,
    reference_type text,
    status text DEFAULT 'completed'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id),
    CONSTRAINT wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.clinic_wallets(id)
);

-- Create developer tables if they don't exist
CREATE TABLE IF NOT EXISTS public.developer_wallets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    developer_id uuid NOT NULL,
    balance numeric NOT NULL DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT developer_wallets_pkey PRIMARY KEY (id),
    CONSTRAINT developer_wallets_developer_id_key UNIQUE (developer_id),
    CONSTRAINT developer_wallets_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES public.app_developers(id)
);

CREATE TABLE IF NOT EXISTS public.developer_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    wallet_id uuid NOT NULL,
    amount numeric NOT NULL,
    type text NOT NULL CHECK (type = ANY (ARRAY['earning'::text, 'withdrawal'::text, 'refund'::text, 'adjustment'::text])),
    description text,
    reference_id text,
    reference_type text,
    status text DEFAULT 'completed'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT developer_transactions_pkey PRIMARY KEY (id),
    CONSTRAINT developer_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.developer_wallets(id)
);

-- Function to handle app subscription via wallet
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
    v_app_developer_id uuid; -- To store developer ID
    v_subscription_id bigint;
    v_period_end timestamp with time zone;
    v_dev_wallet_id uuid; -- To store developer wallet ID
    v_dev_share numeric; -- Developer share amount
BEGIN
    -- 1. Get Wallet Info
    SELECT id, balance INTO v_wallet_id, v_balance
    FROM public.clinic_wallets
    WHERE clinic_id = p_clinic_id;

    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for this clinic';
    END IF;

    -- 2. Get App Info (including developer_id)
    SELECT price, title, billing_period, developer_id 
    INTO v_app_price, v_app_title, v_app_billing_period, v_app_developer_id
    FROM public.tabibi_apps
    WHERE id = p_app_id;

    IF v_app_price IS NULL THEN
        RAISE EXCEPTION 'App not found';
    END IF;

    -- 3. Check Balance
    IF v_balance < v_app_price THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- 4. Calculate Period End
    IF v_app_billing_period = 'monthly' THEN
        v_period_end := now() + interval '1 month';
    ELSIF v_app_billing_period = 'yearly' THEN
        v_period_end := now() + interval '1 year';
    ELSE
        -- one_time or others
        v_period_end := NULL;
    END IF;

    -- 5. Deduct Balance from Clinic
    UPDATE public.clinic_wallets
    SET balance = balance - v_app_price,
        updated_at = now()
    WHERE id = v_wallet_id;

    -- 6. Record Transaction for Clinic
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
        -v_app_price,
        'payment',
        'اشتراك في تطبيق: ' || v_app_title,
        p_app_id::text,
        'app_purchase',
        'completed'
    );

    -- 7. Handle Developer Revenue Share (If developer exists)
    IF v_app_developer_id IS NOT NULL THEN
        -- Calculate share (e.g., 70%)
        v_dev_share := v_app_price * 0.70;

        -- Check/Create Developer Wallet
        SELECT id INTO v_dev_wallet_id
        FROM public.developer_wallets
        WHERE developer_id = v_app_developer_id;

        IF v_dev_wallet_id IS NULL THEN
            INSERT INTO public.developer_wallets (developer_id, balance)
            VALUES (v_app_developer_id, 0)
            RETURNING id INTO v_dev_wallet_id;
        END IF;

        -- Update Developer Wallet
        UPDATE public.developer_wallets
        SET balance = balance + v_dev_share,
            updated_at = now()
        WHERE id = v_dev_wallet_id;

        -- Record Developer Transaction
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

    -- 8. Create/Update Subscription
    SELECT id INTO v_subscription_id
    FROM public.app_subscriptions
    WHERE clinic_id = p_clinic_id AND app_id = p_app_id;

    IF v_subscription_id IS NOT NULL THEN
        -- Update existing
        UPDATE public.app_subscriptions
        SET status = 'active',
            current_period_start = now(),
            current_period_end = v_period_end,
            amount = v_app_price,
            billing_period = v_app_billing_period,
            updated_at = now()
        WHERE id = v_subscription_id
        RETURNING id INTO v_subscription_id;
    ELSE
        -- Create new
        INSERT INTO public.app_subscriptions (
            clinic_id,
            app_id,
            status,
            current_period_start,
            current_period_end,
            amount,
            billing_period,
            auto_renew
        ) VALUES (
            p_clinic_id,
            p_app_id,
            'active',
            now(),
            v_period_end,
            v_app_price,
            v_app_billing_period,
            true
        )
        RETURNING id INTO v_subscription_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'subscription_id', v_subscription_id,
        'new_balance', v_balance - v_app_price
    );
END;
$$;
