-- ==========================================
-- Improved Database Setup for Tabibi Apps
-- ==========================================

-- 1. Tabibi Apps Table (Redesigned)
CREATE TABLE IF NOT EXISTS public.tabibi_apps (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  title text NOT NULL,
  short_description text,
  full_description text,
  price numeric DEFAULT 0, -- Numeric price
  billing_period text DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly', 'one_time')),
  image_url text, -- Main app image
  category text,
  features jsonb DEFAULT '[]'::jsonb,
  screenshots jsonb DEFAULT '[]'::jsonb, -- Additional screenshots
  component_key text UNIQUE,
  is_active boolean DEFAULT true,
  color text -- Keeping color for fallback/theme if needed
);

-- 2. App Subscriptions Table (New)
CREATE TABLE IF NOT EXISTS public.app_subscriptions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  clinic_id uuid NOT NULL,
  app_id bigint REFERENCES public.tabibi_apps(id) ON DELETE CASCADE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'past_due')),
  current_period_start timestamp with time zone DEFAULT now(),
  current_period_end timestamp with time zone,
  billing_period text,
  amount numeric,
  auto_renew boolean DEFAULT true,
  UNIQUE(clinic_id, app_id) -- One active subscription per app per clinic usually
);

-- 3. Seed Data
INSERT INTO public.tabibi_apps (title, short_description, full_description, price, billing_period, image_url, category, features, color, component_key, screenshots)
VALUES 
(
  'مساعد طبيبي الذكي',
  'تشخيص ذكي وتحليل بيانات',
  'مساعد شخصي متطور يعتمد على الذكاء الاصطناعي لتحليل سجلات المرضى وتقديم اقتراحات تشخيصية دقيقة.',
  200,
  'monthly',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=60',
  'AI',
  '["تحليل الأعراض", "تلخيص التاريخ المرضي", "اقتراح خطط علاجية"]',
  'text-purple-600 bg-purple-100',
  'ai_assistant',
  '["https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=60", "https://images.unsplash.com/photo-1576091160550-2187580023f7?w=800&auto=format&fit=crop&q=60", "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=60"]'
),
(
  'حملات واتساب',
  'تسويق وتواصل آلي',
  'منصة متكاملة لإدارة حملاتك التسويقية عبر واتساب. تواصل مع مرضاك بفعالية.',
  150,
  'monthly',
  'https://images.unsplash.com/photo-1611746341450-953b7f282474?w=800&auto=format&fit=crop&q=60',
  'Marketing',
  '["رسائل جماعية", "قوالب جاهزة", "جدولة"]',
  'text-green-600 bg-green-100',
  'whatsapp_campaigns',
  '["https://images.unsplash.com/photo-1611746341450-953b7f282474?w=800&auto=format&fit=crop&q=60", "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&auto=format&fit=crop&q=60"]'
),
(
  'التقارير المتقدمة',
  'تحليلات شاملة للعيادة',
  'لوحة تحكم تحليلية تمنحك رؤية عميقة لأداء عيادتك.',
  100,
  'monthly',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60',
  'Management',
  '["تحليل الإيرادات", "تتبع مصادر المرضى", "تصدير البيانات"]',
  'text-blue-600 bg-blue-100',
  'advanced_reports',
  '["https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60", "https://images.unsplash.com/photo-1543286386-713df548e9cc?w=800&auto=format&fit=crop&q=60"]'
),
(
  'الموقع الإلكتروني',
  'واجهة احترافية لعيادتك',
  'احصل على موقع إلكتروني متكامل واحترافي لعيادتك.',
  3000,
  'yearly',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60',
  'Marketing',
  '["نطاق خاص", "تصميم عصري", "حجز مواعيد"]',
  'text-indigo-600 bg-indigo-100',
  'clinic_website',
  '["https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60", "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=60"]'
),
(
  'التأمين الطبي',
  'إدارة مطالبات ذكية',
  'نظام ذكي لتبسيط التعامل مع شركات التأمين.',
  250,
  'monthly',
  'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop&q=60',
  'Management',
  '["التحقق من التغطية", "إرسال المطالبات", "تنبيهات النواقص"]',
  'text-orange-600 bg-orange-100',
  'insurance_manager',
  '["https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop&q=60", "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=60"]'
)
ON CONFLICT (component_key) DO UPDATE 
SET 
  price = EXCLUDED.price,
  billing_period = EXCLUDED.billing_period,
  image_url = EXCLUDED.image_url,
  screenshots = EXCLUDED.screenshots;
