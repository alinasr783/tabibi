BEGIN;

DO $$
DECLARE
  pricing_features_type text;
  pricing_features_udt text;
  plans_limits_type text;
BEGIN
  SELECT data_type, udt_name
  INTO pricing_features_type, pricing_features_udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'plan_pricing'
    AND column_name = 'features';

  SELECT data_type
  INTO plans_limits_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'plans'
    AND column_name = 'limits';

  IF plans_limits_type IS NULL THEN
    RAISE EXCEPTION 'Column public.plans.limits not found';
  END IF;

  IF plans_limits_type = 'jsonb' THEN
    INSERT INTO public.plans (id, name, price, limits)
    VALUES
      ('basic', 'الباقة الأساسية', 200, '{"max_patients":50,"max_appointments":200,"max_treatment_templates":10,"max_secretaries":1,"features":{"income":true,"whatsapp":false,"watermark":false}}'::jsonb),
      ('standard', 'الباقة القياسية', 500, '{"max_patients":200,"max_appointments":-1,"max_treatment_templates":50,"max_secretaries":3,"features":{"income":true,"whatsapp":true,"watermark":false}}'::jsonb),
      ('premium', 'الباقة الاحترافية', 1000, '{"max_patients":-1,"max_appointments":-1,"max_treatment_templates":-1,"max_secretaries":-1,"features":{"income":true,"whatsapp":true,"watermark":false}}'::jsonb)
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        price = EXCLUDED.price,
        limits = EXCLUDED.limits;
  ELSE
    INSERT INTO public.plans (id, name, price, limits)
    VALUES
      ('basic', 'الباقة الأساسية', 200, '{"max_patients":50,"max_appointments":200,"max_treatment_templates":10,"max_secretaries":1,"features":{"income":true,"whatsapp":false,"watermark":false}}'),
      ('standard', 'الباقة القياسية', 500, '{"max_patients":200,"max_appointments":-1,"max_treatment_templates":50,"max_secretaries":3,"features":{"income":true,"whatsapp":true,"watermark":false}}'),
      ('premium', 'الباقة الاحترافية', 1000, '{"max_patients":-1,"max_appointments":-1,"max_treatment_templates":-1,"max_secretaries":-1,"features":{"income":true,"whatsapp":true,"watermark":false}}')
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        price = EXCLUDED.price,
        limits = EXCLUDED.limits;
  END IF;

  IF pricing_features_type IS NULL THEN
    RAISE EXCEPTION 'Column public.plan_pricing.features not found';
  END IF;

  IF pricing_features_type = 'jsonb' THEN
    INSERT INTO public.plan_pricing (id, name, price, popular, features, description)
    VALUES
      ('basic', 'الباقة الأساسية', 200, false, '["حتى 50 مريض","حتى 200 حجز شهريًا","تقارير مالية أساسية","دعم عبر البريد الإلكتروني"]'::jsonb, 'مناسبة للعيادات الصغيرة'),
      ('standard', 'الباقة القياسية', 500, true, '["حتى 200 مريض","حجز غير محدود","تقارير مالية مفصلة","تذكيرات آلية للمرضى","دعم عبر الهاتف والبريد الإلكتروني"]'::jsonb, 'الأكثر شيوعًا'),
      ('premium', 'الباقة الاحترافية', 1000, false, '["غير محدود مرضى","غير محدود حجوزات","غير محدود قوالب علاجية","غير محدود موظفين","كل المزايا متاحة"]'::jsonb, 'كل شيء غير محدود')
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        price = EXCLUDED.price,
        popular = EXCLUDED.popular,
        features = EXCLUDED.features,
        description = EXCLUDED.description;
  ELSIF pricing_features_type = 'ARRAY' AND pricing_features_udt = '_text' THEN
    INSERT INTO public.plan_pricing (id, name, price, popular, features, description)
    VALUES
      ('basic', 'الباقة الأساسية', 200, false, ARRAY['حتى 50 مريض','حتى 200 حجز شهريًا','تقارير مالية أساسية','دعم عبر البريد الإلكتروني']::text[], 'مناسبة للعيادات الصغيرة'),
      ('standard', 'الباقة القياسية', 500, true, ARRAY['حتى 200 مريض','حجز غير محدود','تقارير مالية مفصلة','تذكيرات آلية للمرضى','دعم عبر الهاتف والبريد الإلكتروني']::text[], 'الأكثر شيوعًا'),
      ('premium', 'الباقة الاحترافية', 1000, false, ARRAY['غير محدود مرضى','غير محدود حجوزات','غير محدود قوالب علاجية','غير محدود موظفين','كل المزايا متاحة']::text[], 'كل شيء غير محدود')
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        price = EXCLUDED.price,
        popular = EXCLUDED.popular,
        features = EXCLUDED.features,
        description = EXCLUDED.description;
  ELSE
    RAISE EXCEPTION 'Unsupported plan_pricing.features type: %, udt: %', pricing_features_type, pricing_features_udt;
  END IF;
END $$;

COMMIT;

