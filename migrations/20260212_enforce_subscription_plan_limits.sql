CREATE OR REPLACE FUNCTION public.tabibi_require_active_subscription(p_clinic_id uuid)
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  s public.subscriptions;
BEGIN
  SELECT *
  INTO s
  FROM public.subscriptions
  WHERE clinic_id = p_clinic_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF s.id IS NULL THEN
    RAISE EXCEPTION 'لا يوجد اشتراك مفعل. برجاء الاشتراك في باقة للاستمرار.';
  END IF;

  IF s.current_period_end IS NOT NULL AND s.current_period_end <= now() THEN
    RAISE EXCEPTION 'انتهت صلاحية الاشتراك. برجاء تجديد الباقة.';
  END IF;

  RETURN s;
END;
$$;

CREATE OR REPLACE FUNCTION public.tabibi_get_plan_limits(p_clinic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  s public.subscriptions;
  lim jsonb;
BEGIN
  s := public.tabibi_require_active_subscription(p_clinic_id);
  SELECT limits INTO lim FROM public.plans WHERE id = s.plan_id;
  RETURN COALESCE(lim, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.tabibi_enforce_patients_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  lim jsonb;
  max_patients int;
  month_start timestamptz;
  month_end timestamptz;
  current_count bigint;
BEGIN
  lim := public.tabibi_get_plan_limits(NEW.clinic_id);
  max_patients := COALESCE((lim->>'max_patients')::int, -1);

  IF max_patients = -1 THEN
    RETURN NEW;
  END IF;

  month_start := date_trunc('month', now());
  month_end := month_start + interval '1 month';

  SELECT count(*)
  INTO current_count
  FROM public.patients p
  WHERE p.clinic_id = NEW.clinic_id
    AND p.created_at >= month_start
    AND p.created_at < month_end;

  IF current_count >= max_patients THEN
    RAISE EXCEPTION 'لقد تجاوزت الحد المسموح من المرضى لهذا الشهر. يرجى ترقية الباقة.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tabibi_enforce_patients_limits ON public.patients;
CREATE TRIGGER tabibi_enforce_patients_limits
BEFORE INSERT ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.tabibi_enforce_patients_limits();

CREATE OR REPLACE FUNCTION public.tabibi_enforce_appointments_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  lim jsonb;
  max_appointments int;
  appointment_ts timestamptz;
  month_start timestamptz;
  month_end timestamptz;
  current_count bigint;
BEGIN
  lim := public.tabibi_get_plan_limits(NEW.clinic_id);
  max_appointments := COALESCE((lim->>'max_appointments')::int, -1);

  IF max_appointments = -1 THEN
    RETURN NEW;
  END IF;

  IF NEW.date IS NULL OR length(NEW.date) = 0 THEN
    RAISE EXCEPTION 'تاريخ الموعد مطلوب';
  END IF;

  appointment_ts := NEW.date::timestamptz;
  month_start := date_trunc('month', appointment_ts);
  month_end := month_start + interval '1 month';

  SELECT count(*)
  INTO current_count
  FROM public.appointments a
  WHERE a.clinic_id = NEW.clinic_id
    AND a.date IS NOT NULL
    AND a.date::timestamptz >= month_start
    AND a.date::timestamptz < month_end;

  IF current_count >= max_appointments THEN
    RAISE EXCEPTION 'لقد تجاوزت الحد المسموح من المواعيد لهذا الشهر. يرجى ترقية الباقة.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tabibi_enforce_appointments_limits ON public.appointments;
CREATE TRIGGER tabibi_enforce_appointments_limits
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.tabibi_enforce_appointments_limits();

CREATE OR REPLACE FUNCTION public.tabibi_enforce_treatment_templates_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  lim jsonb;
  max_templates int;
  current_count bigint;
BEGIN
  lim := public.tabibi_get_plan_limits(NEW.clinic_id);
  max_templates := COALESCE((lim->>'max_treatment_templates')::int, -1);

  IF max_templates = -1 THEN
    RETURN NEW;
  END IF;

  SELECT count(*)
  INTO current_count
  FROM public.treatment_templates t
  WHERE t.clinic_id = NEW.clinic_id;

  IF current_count >= max_templates THEN
    RAISE EXCEPTION 'لقد تجاوزت الحد المسموح من الخطط العلاجية. يرجى ترقية الباقة.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tabibi_enforce_treatment_templates_limits ON public.treatment_templates;
CREATE TRIGGER tabibi_enforce_treatment_templates_limits
BEFORE INSERT ON public.treatment_templates
FOR EACH ROW
EXECUTE FUNCTION public.tabibi_enforce_treatment_templates_limits();

CREATE OR REPLACE FUNCTION public.tabibi_enforce_secretaries_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  lim jsonb;
  max_secretaries int;
  current_count bigint;
BEGIN
  IF NEW.role IS DISTINCT FROM 'secretary' THEN
    RETURN NEW;
  END IF;

  lim := public.tabibi_get_plan_limits(NEW.clinic_id);
  max_secretaries := COALESCE((lim->>'secretary')::int, (lim->>'max_secretaries')::int, -1);

  IF max_secretaries = -1 THEN
    RETURN NEW;
  END IF;

  SELECT count(*)
  INTO current_count
  FROM public.users u
  WHERE u.clinic_id = NEW.clinic_id
    AND u.role = 'secretary';

  IF current_count >= max_secretaries THEN
    RAISE EXCEPTION 'لقد تجاوزت الحد المسموح من السكرتارية. يرجى ترقية الباقة.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tabibi_enforce_secretaries_limits ON public.users;
CREATE TRIGGER tabibi_enforce_secretaries_limits
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.tabibi_enforce_secretaries_limits();

