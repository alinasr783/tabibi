CREATE OR REPLACE FUNCTION public.handle_visit_insert_for_plan()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan record;
  v_template record;
  v_clinic record;
  v_new_completed integer;
  v_total integer;
  v_mode text;
  v_bundle_size integer;
  v_bundle_price numeric;
  v_session_price numeric;
  v_charge_amount numeric;
  v_reference_key text;
  v_description text;
  v_clinic_id_bigint bigint;
BEGIN
  IF NEW.patient_plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, clinic_id, template_id, total_sessions, completed_sessions, status, advanced_settings
  INTO v_plan
  FROM public.patient_plans
  WHERE id = NEW.patient_plan_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF v_plan.status IS NOT NULL AND v_plan.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  v_total := COALESCE(v_plan.total_sessions, 0);
  v_new_completed := COALESCE(v_plan.completed_sessions, 0) + 1;

  UPDATE public.patient_plans
  SET
    completed_sessions = v_new_completed,
    status = CASE
      WHEN v_total > 0 AND v_new_completed >= v_total THEN 'completed'
      ELSE COALESCE(status, 'active')
    END,
    updated_at = now()
  WHERE id = v_plan.id;

  SELECT id, clinic_id_bigint
  INTO v_clinic
  FROM public.clinics
  WHERE clinic_uuid = NEW.clinic_id
  LIMIT 1;

  v_clinic_id_bigint := COALESCE(v_clinic.clinic_id_bigint, v_clinic.id);
  IF v_clinic_id_bigint IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, session_price, name
  INTO v_template
  FROM public.treatment_templates
  WHERE id = v_plan.template_id
  LIMIT 1;

  v_session_price := COALESCE(v_template.session_price, 0);

  v_mode := COALESCE(v_plan.advanced_settings->'billing'->>'mode', 'per_session');

  IF v_mode = 'bundle' THEN
    v_bundle_size := NULLIF((v_plan.advanced_settings->'billing'->>'bundleSize')::int, 0);
    v_bundle_price := NULLIF((v_plan.advanced_settings->'billing'->>'bundlePrice')::numeric, 0);
    IF v_bundle_size IS NULL OR v_bundle_price IS NULL THEN
      RETURN NEW;
    END IF;
    IF v_new_completed % v_bundle_size <> 0 THEN
      RETURN NEW;
    END IF;
    v_charge_amount := v_bundle_price;
    v_reference_key := 'plan:' || v_plan.id::text || ':bundle:' || (v_new_completed / v_bundle_size)::text;
    v_description := 'مستحقات باقة جلسات - ' || COALESCE(v_template.name, 'خطة علاجية');
  ELSE
    v_charge_amount := v_session_price;
    v_reference_key := 'plan:' || v_plan.id::text || ':session:' || v_new_completed::text;
    v_description := 'مستحقات جلسة علاجية - ' || COALESCE(v_template.name, 'خطة علاجية');
  END IF;

  IF v_charge_amount IS NULL OR v_charge_amount <= 0 THEN
    RETURN NEW;
  END IF;

  IF v_reference_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.financial_records fr
      WHERE fr.clinic_id = v_clinic_id_bigint
        AND fr.reference_key = v_reference_key
      LIMIT 1
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.financial_records (
      clinic_id,
      patient_id,
      patient_plan_id,
      visit_id,
      amount,
      type,
      description,
      reference_key,
      recorded_at
    )
    VALUES (
      v_clinic_id_bigint,
      NEW.patient_id,
      v_plan.id,
      NEW.id,
      v_charge_amount,
      'charge',
      v_description,
      v_reference_key,
      COALESCE(NEW.created_at, now())
    );
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS visits_after_insert_plan_trigger ON public.visits;
CREATE TRIGGER visits_after_insert_plan_trigger
AFTER INSERT ON public.visits
FOR EACH ROW
EXECUTE FUNCTION public.handle_visit_insert_for_plan();
