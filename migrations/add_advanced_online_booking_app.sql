-- Add Advanced Online Booking App to Tabibi Apps Store
-- Corrected schema based on database.txt

INSERT INTO tabibi_apps (
    title,
    short_description,
    full_description,
    price,
    billing_period,
    image_url,
    component_key,
    category,
    is_active,
    features,
    preview_link,
    color,
    images
) VALUES (
    'نظام الحجز الإلكتروني المتطور',
    'إدارة متقدمة للحجوزات تشمل الإحصائيات، الحجوزات غير المكتملة، وحظر الأرقام المزعجة.',
    'يوفر هذا التطبيق لوحة تحكم شاملة للحجز الإلكتروني. يمكنك من خلاله متابعة الحجوزات، الاطلاع على إحصائيات الزوار، متابعة الحجوزات التي لم تكتمل (Lost Leads)، بالإضافة إلى خاصية حظر الأرقام المزعجة لمنعها من الحجز مرة أخرى.',
    0,
    'one_time',
    NULL,
    'advanced_online_booking',
    'Management',
    true,
    '[
        {"title": "إحصائيات متقدمة", "description": "تتبع عدد الزيارات ونسب التحويل"},
        {"title": "الحجوزات غير المكتملة", "description": "شاهد من بدأ الحجز ولم يكمله"},
        {"title": "نظام الحظر", "description": "امنع الأرقام المزعجة من الحجز"}
    ]'::jsonb,
    '/online-booking',
    'text-teal-600 bg-teal-100',
    '[]'::jsonb
) ON CONFLICT (component_key) DO UPDATE SET
    title = EXCLUDED.title,
    short_description = EXCLUDED.short_description,
    full_description = EXCLUDED.full_description,
    features = EXCLUDED.features,
    color = EXCLUDED.color,
    is_active = EXCLUDED.is_active;
