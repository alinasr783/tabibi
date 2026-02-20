INSERT INTO public.plan_pricing (id, name, price, popular, features, description)
VALUES
('basic', 'الباقة الأساسية', 200.00, false, '["حتى 50 مريض","حتى 200 حجز شهريًا","تقارير مالية أساسية","دعم عبر البريد الإلكتروني"]'::jsonb, 'مناسبة للعيادات الصغيرة')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    price = EXCLUDED.price,
    popular = EXCLUDED.popular,
    features = EXCLUDED.features,
    description = EXCLUDED.description;

INSERT INTO public.plan_pricing (id, name, price, popular, features, description)
VALUES
('standard', 'الباقة القياسية', 500.00, true, '["حتى 200 مريض","حجز غير محدود","تقارير مالية مفصلة","تذكيرات آلية للمرضى","دعم عبر الهاتف والبريد الإلكتروني"]'::jsonb, 'الأكثر شيوعًا')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    price = EXCLUDED.price,
    popular = EXCLUDED.popular,
    features = EXCLUDED.features,
    description = EXCLUDED.description;

INSERT INTO public.plan_pricing (id, name, price, popular, features, description)
VALUES
('premium', 'الباقة الاحترافية', 1000.00, false, '["غير محدود مرضى","غير محدود حجوزات","غير محدود قوالب علاجية","غير محدود موظفين","كل المزايا متاحة"]'::jsonb, 'كل شيء غير محدود')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    price = EXCLUDED.price,
    popular = EXCLUDED.popular,
    features = EXCLUDED.features,
    description = EXCLUDED.description;
