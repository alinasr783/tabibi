-- Fix Double Notifications & Syntax Error
-- This script:
-- 1. Defines the date formatter helper function (needed for the smart notification).
-- 2. Removes ALL duplicate/old triggers to stop double notifications.
-- 3. Creates the single, correct 'Smart' trigger for Appointments and Wallets.

-- ==========================================
-- 1. Helper Function: Egyptian Date Formatter
-- ==========================================
CREATE OR REPLACE FUNCTION public.format_egyptian_date(ts timestamptz) RETURNS text AS $$
DECLARE
  day_name text;
  month_name text;
  time_str text;
  is_pm boolean;
  hour_num int;
  minute_str text;
  cairo_ts timestamp;
BEGIN
  IF ts IS NULL THEN RETURN ''; END IF;
  
  -- Convert to Cairo time
  cairo_ts := ts AT TIME ZONE 'Africa/Cairo';
  
  -- Time part
  hour_num := extract(hour from cairo_ts);
  is_pm := hour_num >= 12;
  IF hour_num > 12 THEN hour_num := hour_num - 12; END IF;
  IF hour_num = 0 THEN hour_num := 12; END IF;
  minute_str := to_char(cairo_ts, 'MI');
  time_str := hour_num || ':' || minute_str || ' ' || CASE WHEN is_pm THEN 'مساءً' ELSE 'صباحاً' END;

  -- Date part
  IF date(cairo_ts) = date(now() AT TIME ZONE 'Africa/Cairo') THEN
    RETURN 'النهاردة الساعة ' || time_str;
  ELSIF date(cairo_ts) = date((now() - interval '1 day') AT TIME ZONE 'Africa/Cairo') THEN
    RETURN 'امبارح الساعة ' || time_str;
  ELSE
    -- Day name mapping
    day_name := CASE extract(dow from cairo_ts)
      WHEN 0 THEN 'الأحد'
      WHEN 1 THEN 'الاثنين'
      WHEN 2 THEN 'الثلاثاء'
      WHEN 3 THEN 'الأربعاء'
      WHEN 4 THEN 'الخميس'
      WHEN 5 THEN 'الجمعة'
      WHEN 6 THEN 'السبت'
    END;
    
    -- Month name mapping
    month_name := CASE extract(month from cairo_ts)
      WHEN 1 THEN 'يناير'
      WHEN 2 THEN 'فبراير'
      WHEN 3 THEN 'مارس'
      WHEN 4 THEN 'أبريل'
      WHEN 5 THEN 'مايو'
      WHEN 6 THEN 'يونيو'
      WHEN 7 THEN 'يوليو'
      WHEN 8 THEN 'أغسطس'
      WHEN 9 THEN 'سبتمبر'
      WHEN 10 THEN 'أكتوبر'
      WHEN 11 THEN 'نوفمبر'
      WHEN 12 THEN 'ديسمبر'
    END;
    
    RETURN 'يوم ' || day_name || ' ' || extract(day from cairo_ts) || ' ' || month_name || ' الساعة ' || time_str;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- 2. Cleanup Old Triggers (The Fix)
-- ==========================================

-- Appointments
DROP TRIGGER IF EXISTS on_new_appointment ON public.appointments;
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
DROP TRIGGER IF EXISTS on_appointment_created_smart ON public.appointments;
DROP FUNCTION IF EXISTS public.handle_new_appointment();

-- Wallet
DROP TRIGGER IF EXISTS on_wallet_transaction ON public.wallet_transactions;
DROP TRIGGER IF EXISTS on_wallet_transaction_smart ON public.wallet_transactions;
DROP FUNCTION IF EXISTS public.handle_wallet_transaction();


-- ==========================================
-- 3. Create Smart Trigger: Appointments
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_appointment_smart() RETURNS TRIGGER AS $$
DECLARE
  patient_name text;
  formatted_time text;
  action_btns jsonb;
  appt_ts timestamptz;
BEGIN
  -- Get Patient Name
  SELECT name INTO patient_name FROM public.patients WHERE id = NEW.patient_id;
  
  -- Try to parse date string to timestamp, fallback to created_at
  BEGIN
    appt_ts := NEW.date::timestamp with time zone;
  EXCEPTION WHEN OTHERS THEN
    appt_ts := NEW.created_at;
  END;
  
  formatted_time := public.format_egyptian_date(appt_ts);
  
  -- Build Action Buttons
  action_btns := jsonb_build_array(
    jsonb_build_object('text', 'شوف تفاصيل الحجز', 'link', '/calendar', 'variant', 'default'),
    jsonb_build_object('text', 'شوف تفاصيل المريض', 'link', '/patients/' || NEW.patient_id, 'variant', 'outline')
  );

  -- Insert Notification
  INSERT INTO public.notifications (
    type,
    title,
    message,
    clinic_id,
    appointment_id,
    patient_id,
    action_buttons,
    created_at
  ) VALUES (
    CASE 
      WHEN NEW."from" = 'booking' THEN 'online_appointment' 
      ELSE 'appointment' 
    END,
    CASE 
      WHEN NEW."from" = 'booking' THEN 'حجز جديد من النت' 
      ELSE 'حجز جديد من العيادة' 
    END,
    'المريض (' || COALESCE(patient_name, 'غير معروف') || ') حجز معاد جديد (' || formatted_time || ')',
    NEW.clinic_id,
    NEW.id,
    NEW.patient_id,
    action_btns,
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_appointment_created_smart
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_appointment_smart();


-- ==========================================
-- 4. Create Smart Trigger: Wallet
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_wallet_transaction_smart() RETURNS TRIGGER AS $$
DECLARE
  clinic_id_val uuid;
  title_text text;
  msg_text text;
  current_balance numeric;
  action_btns jsonb;
BEGIN
  -- Get Clinic ID and Current Balance
  SELECT clinic_id, balance INTO clinic_id_val, current_balance 
  FROM public.clinic_wallets 
  WHERE id = NEW.wallet_id;
  
  -- Define Notification Content based on Transaction Type
  IF NEW.type = 'deposit' OR NEW.type = 'adjustment' OR NEW.type = 'bonus' THEN
    title_text := 'تم شحن الرصيد';
    msg_text := 'تم إضافة ' || NEW.amount || ' جنيه إلى محفظتك. رصيدك الحالي: ' || current_balance || ' جنيه';
    action_btns := jsonb_build_array(
      jsonb_build_object('text', 'الذهاب للماليات', 'link', '/finance', 'variant', 'default')
    );
  ELSIF NEW.type = 'payment' THEN
    title_text := 'تم استخدام الرصيد';
    msg_text := 'تم خصم ' || NEW.amount || ' جنيه من محفظتك مقابل ' || COALESCE(NEW.description, 'خدمة مدفوعة');
    action_btns := jsonb_build_array(
      jsonb_build_object('text', 'تفاصيل المعاملة', 'link', '/finance', 'variant', 'outline')
    );
  ELSE
    RETURN NEW; -- Ignore other types for now
  END IF;

  -- Check for duplicates (prevent double notification for same transaction)
  IF EXISTS (
    SELECT 1 FROM public.notifications 
    WHERE clinic_id = clinic_id_val 
    AND type = 'wallet' 
    AND title = title_text
    AND message = msg_text
    AND created_at > now() - interval '1 minute'
  ) THEN
    RETURN NEW;
  END IF;

  -- Insert Notification
  INSERT INTO public.notifications (
    type,
    title,
    message,
    clinic_id,
    action_buttons,
    created_at
  ) VALUES (
    'wallet',
    title_text,
    msg_text,
    clinic_id_val,
    action_btns,
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Trigger to Wallet Transactions (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions') THEN
    DROP TRIGGER IF EXISTS on_wallet_transaction_smart ON public.wallet_transactions;
    CREATE TRIGGER on_wallet_transaction_smart
      AFTER INSERT ON public.wallet_transactions
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_wallet_transaction_smart();
  END IF;
END $$;
