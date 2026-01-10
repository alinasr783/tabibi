-- ==========================================
-- Full Database Setup for Tabibi (including Apps)
-- ==========================================

-- 1. Base Schema (from database.txt)
-- Note: Existing tables are preserved if they match.
-- We use IF NOT EXISTS where possible or rely on the user running this on a fresh DB or handling conflicts.

CREATE TABLE IF NOT EXISTS public.appointments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  patient_id bigint,
  date text,
  notes text,
  status text,
  price bigint,
  "from" text,
  clinic_id uuid,
  age bigint,
  CONSTRAINT appointments_pkey PRIMARY KEY (id)
  -- Foreign keys added later to avoid order issues if tables don't exist yet
);

CREATE TABLE IF NOT EXISTS public.blocked_phones (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  clinic_id uuid NOT NULL,
  phone_number text NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT blocked_phones_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.booking_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  visitor_id text,
  ip_address text,
  country text,
  city text,
  device_type text,
  browser text,
  event_type text CHECK (event_type = ANY (ARRAY['view'::text, 'conversion'::text, 'blocked_attempt'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_analytics_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.booking_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  visitor_id text,
  session_id text,
  current_step integer,
  patient_name text,
  patient_phone text,
  selected_date text,
  selected_time text,
  form_data jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'in_progress'::text CHECK (status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'abandoned'::text])),
  CONSTRAINT booking_drafts_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clinic_id text NOT NULL,
  title text DEFAULT 'محادثة جديدة'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_archived boolean DEFAULT false,
  CONSTRAINT chat_conversations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.clinics (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text,
  address text,
  booking_price integer,
  available_time jsonb,
  current_plan text,
  clinic_uuid uuid DEFAULT gen_random_uuid(),
  online_booking_enabled boolean DEFAULT true,
  clinic_id_bigint bigint,
  CONSTRAINT clinics_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.daily_email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clinic_id uuid,
  email_to text NOT NULL,
  appointments_count integer NOT NULL DEFAULT 0,
  sent_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'sent'::text CHECK (status = ANY (ARRAY['sent'::text, 'failed'::text, 'skipped'::text])),
  error_message text,
  CONSTRAINT daily_email_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.discount_redemptions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  discount_id bigint NOT NULL,
  clinic_id uuid,
  appointment_id bigint,
  patient_plan_id bigint,
  subscription_id bigint,
  redeemed_by bigint,
  amount_discounted numeric,
  CONSTRAINT discount_redemptions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.discounts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  code text,
  is_percentage boolean,
  value real,
  is_active boolean,
  plan_id text,
  max_uses integer,
  used_count integer DEFAULT 0,
  expiration_date timestamp with time zone,
  message text,
  billing_period text DEFAULT 'both'::text CHECK (billing_period = ANY (ARRAY['monthly'::text, 'annual'::text, 'both'::text])),
  CONSTRAINT discounts_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  device_type text DEFAULT 'web'::text,
  created_at timestamp with time zone DEFAULT now(),
  last_updated timestamp with time zone DEFAULT now(),
  CONSTRAINT fcm_tokens_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.financial_records (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  clinic_id bigint NOT NULL,
  appointment_id bigint,
  patient_id bigint,
  patient_plan_id bigint,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['income'::text, 'expense'::text])),
  description text NOT NULL,
  recorded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT financial_records_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clinic_id uuid,
  provider text NOT NULL,
  integration_type text NOT NULL,
  access_token text,
  refresh_token text,
  expires_at timestamp with time zone,
  scope text,
  token_type text,
  id_token text,
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT integrations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type character varying NOT NULL,
  title character varying NOT NULL,
  message text,
  clinic_id uuid NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  related_id character varying,
  appointment_id bigint,
  patient_id bigint,
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.patient_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  patient_id bigint,
  clinic_id uuid,
  file_name text,
  file_url text NOT NULL,
  file_type text,
  category text,
  description text,
  CONSTRAINT patient_attachments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.patient_plans (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  template_id bigint,
  total_sessions integer,
  completed_sessions integer,
  status text,
  patient_id bigint,
  total_price bigint,
  clinic_id uuid,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_plans_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.patients (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text,
  phone text,
  address text,
  date_of_birth text,
  blood_type text,
  gender text,
  clinic_id uuid,
  age integer,
  updated_at timestamp with time zone DEFAULT now(),
  age_unit text DEFAULT 'years'::text,
  job text,
  marital_status text,
  email text,
  notes text,
  medical_history jsonb DEFAULT '{}'::jsonb,
  insurance_info jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT patients_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.plan_pricing (
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  price real,
  id text NOT NULL,
  features jsonb,
  popular boolean,
  name text,
  description text,
  CONSTRAINT plan_pricing_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.plans (
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id text NOT NULL,
  name text,
  limits jsonb,
  price numeric,
  CONSTRAINT plans_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  plan_id text,
  status text DEFAULT 'active'::text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  payment_method text,
  billing_period text DEFAULT 'monthly'::text CHECK (billing_period = ANY (ARRAY['monthly'::text, 'annual'::text])),
  amount numeric,
  clinic_id uuid,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.treatment_templates (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text,
  session_count integer,
  session_price integer,
  description text,
  clinic_id uuid,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT treatment_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  theme_mode text DEFAULT 'system'::text CHECK (theme_mode = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])),
  primary_color character varying DEFAULT '#1AA19C'::character varying,
  secondary_color character varying DEFAULT '#224FB5'::character varying,
  accent_color character varying DEFAULT '#FF6B6B'::character varying,
  logo_url text,
  company_name text,
  menu_items jsonb DEFAULT '[]'::jsonb,
  sidebar_collapsed boolean DEFAULT false,
  sidebar_style text DEFAULT 'default'::text CHECK (sidebar_style = ANY (ARRAY['default'::text, 'compact'::text, 'full'::text])),
  language text DEFAULT 'ar'::text CHECK (language = ANY (ARRAY['ar'::text, 'en'::text])),
  notifications_enabled boolean DEFAULT true,
  sound_notifications boolean DEFAULT true,
  dashboard_widgets jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  daily_appointments_email_enabled boolean DEFAULT false,
  daily_appointments_email_time text DEFAULT '07:00'::text,
  timezone text DEFAULT 'Africa/Cairo'::text,
  CONSTRAINT user_preferences_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text,
  phone text,
  role text,
  permissions text,
  email text,
  user_id text,
  clinic_id uuid,
  auth_uid uuid,
  clinic_id_bigint bigint,
  avatar_url text,
  bio text,
  education jsonb DEFAULT '[]'::jsonb,
  certificates jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.visits (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  patient_id bigint,
  diagnosis text,
  notes text,
  medications jsonb,
  clinic_id uuid,
  patient_plan_id bigint,
  CONSTRAINT visits_pkey PRIMARY KEY (id)
);

-- ==========================================
-- 2. NEW TABLES for Tabibi Apps Marketplace
-- ==========================================

CREATE TABLE IF NOT EXISTS public.tabibi_apps (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  title text NOT NULL,
  short_description text,
  full_description text,
  price text, -- Display price text like "200 ج.م/شهرياً"
  icon_name text, -- Name of Lucide icon to render in frontend
  category text, -- 'AI', 'Marketing', 'Management'
  features jsonb DEFAULT '[]'::jsonb,
  color text, -- Tailwind color classes
  images jsonb DEFAULT '[]'::jsonb,
  component_key text UNIQUE, -- Key to map to frontend component
  component_code text, -- Optional: If we ever store code directly (User request)
  preview_link text, -- Link to preview the app before buying
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.clinic_apps (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  clinic_id uuid NOT NULL, -- References clinics.clinic_uuid (logically)
  app_id bigint REFERENCES public.tabibi_apps(id) ON DELETE CASCADE,
  status text DEFAULT 'active',
  settings jsonb DEFAULT '{}'::jsonb,
  UNIQUE(clinic_id, app_id)
);

-- Seed Data for Tabibi Apps
INSERT INTO public.tabibi_apps (title, short_description, full_description, price, icon_name, category, features, color, component_key)
VALUES 
(
  'مساعد طبيبي الذكي',
  'تشخيص ذكي وتحليل بيانات',
  'مساعد شخصي متطور يعتمد على الذكاء الاصطناعي لتحليل سجلات المرضى وتقديم اقتراحات تشخيصية دقيقة، مما يساعدك في اتخاذ قرارات طبية أسرع وأكثر دقة.',
  '200 ج.م/شهرياً',
  'Bot',
  'AI',
  '["تحليل الأعراض وتقديم الاحتمالات التشخيصية", "تلخيص التاريخ المرضي للمريض تلقائياً", "اقتراح خطط علاجية بناءً على أحدث البروتوكولات", "التكامل مع الملف الطبي الإلكتروني"]',
  'text-purple-600 bg-purple-100',
  'ai_assistant'
),
(
  'حملات واتساب',
  'تسويق وتواصل آلي',
  'منصة متكاملة لإدارة حملاتك التسويقية عبر واتساب. تواصل مع مرضاك بفعالية من خلال رسائل مخصصة، عروض ترويجية، وتذكيرات بالمواعيد لضمان استمرار ولائهم.',
  '150 ج.م/شهرياً',
  'MessageCircle',
  'Marketing',
  '["إرسال رسائل جماعية لشرائح محددة من المرضى", "قوالب رسائل جاهزة ومخصصة", "جدولة الرسائل للإرسال في أوقات محددة", "تقارير تفصيلية عن معدلات الوصول والقراءة"]',
  'text-green-600 bg-green-100',
  'whatsapp_campaigns'
),
(
  'التقارير المتقدمة',
  'تحليلات شاملة للعيادة',
  'لوحة تحكم تحليلية تمنحك رؤية عميقة لأداء عيادتك. تتبع الإيرادات، نمو قاعدة المرضى، وأداء الموظفين من خلال رسوم بيانية تفاعلية وتقارير قابلة للتخصيص.',
  '100 ج.م/شهرياً',
  'BarChart3',
  'Management',
  '["تحليل الإيرادات والمصروفات بدقة", "تتبع مصادر المرضى ومعدلات الحجز", "مقارنة الأداء فترات زمنية مختلفة", "تصدير البيانات بصيغ Excel و PDF"]',
  'text-blue-600 bg-blue-100',
  'advanced_reports'
),
(
  'الموقع الإلكتروني',
  'واجهة احترافية لعيادتك',
  'احصل على موقع إلكتروني متكامل واحترافي لعيادتك في دقائق. اعرض خدماتك، صور العيادة، وآراء المرضى، ومكّن الحجز المباشر لزيادة عدد مرضاك.',
  '300 ج.م/شهرياً',
  'Globe',
  'Marketing',
  '["نطاق خاص (Domain) باسم عيادتك", "تصميم عصري متوافق مع جميع الأجهزة", "نظام حجز مواعيد مرتبط ببرنامج العيادة", "تحسين محركات البحث (SEO) للظهور في جوجل"]',
  'text-indigo-600 bg-indigo-100',
  'clinic_website'
),
(
  'التأمين الطبي',
  'إدارة مطالبات ذكية',
  'نظام ذكي لتبسيط التعامل مع شركات التأمين. تحقق من أهلية المرضى، أرسل المطالبات إلكترونياً، وتابع الموافقات والرفض بشكل لحظي لتقليل المرفوضات.',
  '250 ج.م/شهرياً',
  'ShieldCheck',
  'Management',
  '["التحقق الفوري من تغطية التأمين", "إعداد وإرسال المطالبات إلكترونياً", "تنبيهات عند وجود نواقص في البيانات", "تقارير بمستحقات التأمين وحالات السداد"]',
  'text-orange-600 bg-orange-100',
  'insurance_manager'
)
ON CONFLICT (component_key) DO NOTHING;
