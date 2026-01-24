-- Enable pg_cron if available (optional, for scheduled checks)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Add action_buttons column to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_buttons jsonb;

-- 2. Helper Function: Egyptian Date Formatter (PL/pgSQL)
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

-- 3. Trigger: New Appointment (Smart Notification)
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
    jsonb_build_object('text', 'شوف تفاصيل الحجز', 'link', '/appointments/' || NEW.id, 'variant', 'default'),
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

-- Attach Trigger to Appointments
DROP TRIGGER IF EXISTS on_appointment_created_smart ON public.appointments;
DROP TRIGGER IF EXISTS on_new_appointment ON public.appointments; 
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
DROP FUNCTION IF EXISTS public.handle_new_appointment();

CREATE TRIGGER on_appointment_created_smart
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_appointment_smart();


-- 4. Trigger: Wallet Transactions (Smart Notification)
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
  -- This prevents issues if the trigger fires multiple times or if there's a race condition
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


-- 5. Trigger: App Subscription Changes (Smart Notification)
CREATE OR REPLACE FUNCTION public.handle_app_subscription_smart() RETURNS TRIGGER AS $$
DECLARE
  app_title text;
  action_btns jsonb;
BEGIN
  SELECT title INTO app_title FROM public.tabibi_apps WHERE id = NEW.app_id;
  
  IF TG_OP = 'INSERT' THEN
    -- New Subscription
    action_btns := jsonb_build_array(
      jsonb_build_object('text', 'فتح التطبيق', 'link', '/apps/' || NEW.app_id, 'variant', 'default')
    );
    
    INSERT INTO public.notifications (
      type,
      title,
      message,
      clinic_id,
      action_buttons,
      created_at
    ) VALUES (
      'app',
      'اشتراك جديد في تطبيق',
      'تم الاشتراك بنجاح في تطبيق ' || COALESCE(app_title, 'تطبيق'),
      NEW.clinic_id,
      action_btns,
      now()
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'expired' THEN
    -- Expired Subscription
    action_btns := jsonb_build_array(
      jsonb_build_object('text', 'تجديد الاشتراك', 'link', '/marketplace/' || NEW.app_id, 'variant', 'destructive')
    );

    INSERT INTO public.notifications (
      type,
      title,
      message,
      clinic_id,
      action_buttons,
      created_at
    ) VALUES (
      'alert',
      'انتهاء اشتراك تطبيق',
      'انتهى اشتراكك في تطبيق ' || COALESCE(app_title, 'تطبيق') || '. يرجى التجديد للاستمرار في الاستخدام.',
      NEW.clinic_id,
      action_btns,
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Trigger to App Subscriptions
DROP TRIGGER IF EXISTS on_app_subscription_smart ON public.app_subscriptions;
CREATE TRIGGER on_app_subscription_smart
  AFTER INSERT OR UPDATE ON public.app_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_app_subscription_smart();


-- 6. Scheduled Function: Check Expiring Subscriptions (< 3 Days)
CREATE OR REPLACE FUNCTION public.check_expiring_subscriptions() RETURNS void AS $$
DECLARE
  sub record;
  action_btns jsonb;
BEGIN
  -- 1. Check App Subscriptions
  FOR sub IN 
    SELECT s.*, a.title as app_title 
    FROM public.app_subscriptions s
    JOIN public.tabibi_apps a ON s.app_id = a.id
    WHERE s.status = 'active' 
    AND s.current_period_end < (now() + interval '3 days')
    AND s.current_period_end > now()
  LOOP
    -- Check for duplicate
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE type = 'reminder' 
      AND message LIKE '%باقي أقل من 3 أيام%' 
      AND related_id = 'app_sub_' || sub.id
      AND created_at > (now() - interval '24 hours')
    ) THEN
      
      action_btns := jsonb_build_array(
        jsonb_build_object('text', 'تجديد الآن', 'link', '/marketplace/' || sub.app_id, 'variant', 'default')
      );

      INSERT INTO public.notifications (
        type,
        title,
        message,
        clinic_id,
        related_id,
        action_buttons,
        created_at
      ) VALUES (
        'reminder',
        'قرب انتهاء اشتراك تطبيق',
        'باقي أقل من 3 أيام على انتهاء اشتراك تطبيق ' || sub.app_title,
        sub.clinic_id,
        'app_sub_' || sub.id,
        action_btns,
        now()
      );
    END IF;
  END LOOP;

  -- 2. Check Main Clinic Subscriptions (The "Package")
  FOR sub IN 
    SELECT s.*, p.name as plan_name 
    FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.status = 'active' 
    AND s.current_period_end < (now() + interval '3 days')
    AND s.current_period_end > now()
  LOOP
    -- Check for duplicate
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE type = 'reminder' 
      AND message LIKE '%باقي أقل من 3 أيام على انتهاء باقتك%' 
      AND related_id = 'main_sub_' || sub.id
      AND created_at > (now() - interval '24 hours')
    ) THEN
      
      action_btns := jsonb_build_array(
        jsonb_build_object('text', 'تجديد الباقة', 'link', '/settings/subscription', 'variant', 'default')
      );

      INSERT INTO public.notifications (
        type,
        title,
        message,
        clinic_id,
        related_id,
        action_buttons,
        created_at
      ) VALUES (
        'reminder',
        'قرب انتهاء الباقة',
        'باقي أقل من 3 أيام على انتهاء باقتك الحالية (' || COALESCE(sub.plan_name, 'غير معروف') || ')',
        sub.clinic_id,
        'main_sub_' || sub.id,
        action_btns,
        now()
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. Function for Super Admin to Broadcast Notifications
CREATE OR REPLACE FUNCTION public.broadcast_system_notification(
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_link_text text DEFAULT 'عرض التفاصيل',
  p_image_url text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  clinic_rec record;
  action_btns jsonb;
BEGIN
  -- Prepare action buttons if link is provided
  IF p_link IS NOT NULL THEN
    action_btns := jsonb_build_array(
      jsonb_build_object('text', p_link_text, 'link', p_link, 'variant', 'default')
    );
  ELSE
    action_btns := NULL;
  END IF;

  -- Loop through all clinics and insert notification
  FOR clinic_rec IN SELECT id, clinic_uuid FROM public.clinics LOOP
    INSERT INTO public.notifications (
      type,
      title,
      message,
      clinic_id,
      image_url,
      action_buttons,
      created_at
    ) VALUES (
      'system', -- Type system/admin
      p_title,
      p_message,
      clinic_rec.clinic_uuid,
      p_image_url,
      action_btns,
      now()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
