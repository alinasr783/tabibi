-- SQL script to fix duplicate appointment notifications + unify titles/messages
-- Goal:
-- 1) Prevent double notifications (drop legacy triggers)
-- 2) Keep only ONE smart trigger for new appointments
-- 3) Remove date/time from notification.message (details remain in appointment record)

-- 0) Clean up legacy triggers to prevent duplicates
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
DROP TRIGGER IF EXISTS on_new_appointment ON public.appointments;
DROP TRIGGER IF EXISTS on_new_appointment_smart ON public.appointments;
DROP TRIGGER IF EXISTS on_appointment_created_smart ON public.appointments;

-- Remove legacy function if present
DROP FUNCTION IF EXISTS public.handle_new_appointment();

-- 1) Create or Replace the Smart Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_appointment_smart() RETURNS TRIGGER AS $$
DECLARE
  patient_name text;
  action_btns jsonb;
  notification_title text;
  notification_message text;
  notification_type text;
BEGIN
  IF NEW.patient_id IS NOT NULL THEN
    SELECT name INTO patient_name FROM public.patients WHERE id = NEW.patient_id;
  END IF;

  IF NEW."from" = 'booking' THEN
    notification_title := 'حجز جديد اونلاين';
    notification_type := 'online_appointment';
    notification_message := 'المريض ' || COALESCE(patient_name, 'غير معروف') || ' حجز موعد جديد اونلاين';
  ELSE
    notification_title := 'حجز جديد من العيادة';
    notification_type := 'appointment';
    notification_message := 'تم إضافة حجز جديد للمريض ' || COALESCE(patient_name, 'غير معروف');
  END IF;

  action_btns := jsonb_build_array(
    jsonb_build_object(
      'text', 'واتساب',
      'link', 'https://wa.me/20' || COALESCE((SELECT phone FROM public.patients WHERE id = NEW.patient_id LIMIT 1), ''),
      'variant', 'outline'
    ),
    jsonb_build_object(
      'text', 'تفاصيل الحجز',
      'link', '/appointments/' || NEW.id,
      'variant', 'default'
    )
  );

  INSERT INTO public.notifications (
    type,
    title,
    message,
    clinic_id,
    appointment_id,
    patient_id,
    action_buttons,
    created_at,
    is_read
  ) VALUES (
    notification_type,
    notification_title,
    notification_message,
    NEW.clinic_id,
    NEW.id,
    NEW.patient_id,
    action_btns,
    now(),
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Attach a SINGLE trigger
CREATE TRIGGER on_appointment_created_smart
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_appointment_smart();
