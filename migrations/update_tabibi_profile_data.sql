UPDATE public.tabibi_apps
SET 
    short_description = 'صفحتك الشخصية المتكاملة على الإنترنت',
    full_description = 'أنشئ موقعك الشخصي بدقائق. يعرض Tabibi Profile بياناتك، خبراتك، مواعيد عيادتك، وآراء المرضى في صفحة احترافية واحدة. شارك الرابط مع مرضاك لسهولة الوصول والحجز.',
    price = '150',
    billing_period = 'monthly',
    image_url = 'https://i.ibb.co/tTSnJpqB/20260110-214108-0000.png',
    category = 'Marketing',
    features = '["عرض بيانات العيادة", "عرض المؤهلات والشهادات", "رابط حجز مباشر", "معرض صور للعيادة"]',
    images = '["https://i.ibb.co/jvWhr2WQ/Screenshot-20260110-204518-Chrome-2.jpg", "https://i.ibb.co/kssgNShx/Screenshot-20260110-204530-Chrome-2.jpg", "https://i.ibb.co/PGN1fKHL/Screenshot-20260110-204532-Chrome-2.jpg"]',
    color = '#2563eb',
    preview_link = 'https://tabibi.site/doctor-profile/7cf3a2a3-ee02-4a21-934f-be27f0e20d8f'
WHERE component_key = 'tabibi_profile';
