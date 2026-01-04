-- 1. دالة لإنشاء إشعار جديد عند حجز موعد
CREATE OR REPLACE FUNCTION public.handle_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  patient_name text;
BEGIN
  -- محاولة الحصول على اسم المريض
  SELECT name INTO patient_name FROM public.patients WHERE id = NEW.patient_id;
  
  -- إدراج إشعار في جدول notifications
  INSERT INTO public.notifications (
    type,
    title,
    message,
    clinic_id,
    appointment_id,
    patient_id,
    related_id
  ) VALUES (
    'new_appointment',
    'حجز جديد',
    'تم حجز موعد جديد للمريض ' || COALESCE(patient_name, 'غير معروف') || ' في تاريخ ' || NEW.date,
    NEW.clinic_id,
    NEW.id,
    NEW.patient_id,
    NEW.id::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. إنشاء Trigger يراقب جدول appointments
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
CREATE TRIGGER on_appointment_created
AFTER INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.handle_new_appointment();

-- 3. تفعيل الحماية (RLS) لجدول الإشعارات لضمان أن كل دكتور يرى إشعارات عيادته فقط
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view notifications for their clinic" ON public.notifications;

CREATE POLICY "Users can view notifications for their clinic"
ON public.notifications
FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.users WHERE user_id = auth.uid()
  )
);
