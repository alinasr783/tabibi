-- 1. Ensure 'action_buttons' column exists in 'notifications' table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'action_buttons'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN action_buttons jsonb;
    END IF;
END $$;

-- 2. Create the Smart Trigger Function for Wallet Transactions
CREATE OR REPLACE FUNCTION public.handle_wallet_transaction_smart() RETURNS TRIGGER AS $$
DECLARE
  clinic_id_val uuid;
  title_text text;
  msg_text text;
  action_btns jsonb;
  abs_amount numeric;
BEGIN
  -- Get Clinic ID from the wallet
  SELECT clinic_id INTO clinic_id_val 
  FROM public.clinic_wallets 
  WHERE id = NEW.wallet_id;
  
  -- Safety check: If no clinic found, do nothing
  IF clinic_id_val IS NULL THEN
    RETURN NEW;
  END IF;

  abs_amount := ABS(NEW.amount);

  -- Determine Notification Content based on Amount (+/-) and Description
  IF NEW.amount > 0 THEN
    -- Deposit (شحن)
    title_text := 'شحن رصيد';
    msg_text := 'تم شحن رصيد محفظتك بـ ' || abs_amount || ' جنيه بنجاح.';
    
    action_btns := jsonb_build_array(
      jsonb_build_object('text', 'عرض الرصيد', 'link', '/settings', 'variant', 'default')
    );
  ELSE
    -- Payment / Deduction (خصم)
    title_text := 'خصم من المحفظة';
    
    -- Format message naturally based on description
    IF NEW.description LIKE 'اشتراك في تطبيق:%' THEN
      -- Example: "اشتراك في تطبيق: WhatsApp" -> "تم خصم ... لاشتراكك في تطبيق WhatsApp"
      msg_text := 'تم خصم ' || abs_amount || ' جنيه من محفظتك ' || REPLACE(NEW.description, 'اشتراك في تطبيق:', 'لاشتراكك في تطبيق');
    ELSIF NEW.description LIKE 'تجديد اشتراك:%' THEN
      -- Example: "تجديد اشتراك: WhatsApp" -> "تم خصم ... لتجديد اشتراك WhatsApp"
      msg_text := 'تم خصم ' || abs_amount || ' جنيه من محفظتك لتجديد اشتراك ' || SPLIT_PART(NEW.description, ':', 2);
    ELSE
      -- Fallback for generic deductions
      msg_text := 'تم خصم ' || abs_amount || ' جنيه من محفظتك: ' || COALESCE(NEW.description, 'عملية خصم');
    END IF;

    action_btns := jsonb_build_array(
      jsonb_build_object('text', 'تفاصيل المعاملة', 'link', '/settings', 'variant', 'outline')
    );
  END IF;

  -- Insert Notification into 'notifications' table
  INSERT INTO public.notifications (
    type,
    title,
    message,
    clinic_id,
    action_buttons,
    created_at,
    is_read
  ) VALUES (
    'wallet',        -- Type for frontend icon/logic
    title_text,
    msg_text,
    clinic_id_val,
    action_btns,
    now(),
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop old triggers to avoid duplicates
DROP TRIGGER IF EXISTS on_wallet_transaction_smart ON public.wallet_transactions;
DROP TRIGGER IF EXISTS on_wallet_transaction_created ON public.wallet_transactions;

-- 4. Attach the new Smart Trigger
CREATE TRIGGER on_wallet_transaction_smart
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_wallet_transaction_smart();
