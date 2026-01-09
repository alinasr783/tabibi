-- 1. جدول إحصائيات صفحة الحجز (Analytics)
CREATE TABLE public.booking_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL, -- يربط برقم العيادة (UUID)
  visitor_id text, -- معرف الزائر (من LocalStorage) لتتبع المستخدمين الفريدين
  ip_address text,
  country text,
  city text,
  device_type text, -- mobile, desktop, tablet
  browser text,
  event_type text CHECK (event_type IN ('view', 'conversion', 'blocked_attempt')), -- نوع الحدث: مشاهدة، حجز ناجح، محاولة محظورة
  created_at timestamptz DEFAULT now()
);

-- فهرس لتحسين البحث في الاحصائيات
CREATE INDEX idx_booking_analytics_clinic_id ON public.booking_analytics(clinic_id);
CREATE INDEX idx_booking_analytics_created_at ON public.booking_analytics(created_at);

-- 2. جدول الحجوزات غير المكتملة (Abandoned Bookings / Drafts)
CREATE TABLE public.booking_drafts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL,
  visitor_id text,
  session_id text, -- لتمييز الجلسة الحالية
  current_step integer, -- الخطوة التي وصل إليها المستخدم
  patient_name text,
  patient_phone text,
  selected_date text,
  selected_time text,
  form_data jsonb, -- باقي البيانات كـ JSON
  ip_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

CREATE INDEX idx_booking_drafts_clinic_id ON public.booking_drafts(clinic_id);

-- 3. جدول الأرقام المحظورة (Blocked Numbers)
CREATE TABLE public.blocked_phones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clinic_id uuid NOT NULL,
  phone_number text NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_blocked_phones_clinic_phone ON public.blocked_phones(clinic_id, phone_number);

-- سياسات الأمان (RLS Policies)

-- تفعيل RLS
ALTER TABLE public.booking_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_phones ENABLE ROW LEVEL SECURITY;

-- سياسات Analytics
-- السماح للجميع (public) بإضافة إحصائيات (مثل مشاهدة الصفحة)
CREATE POLICY "Allow public insert to analytics" ON public.booking_analytics
  FOR INSERT WITH CHECK (true);

-- السماح لأصحاب العيادة فقط برؤية إحصائياتهم
CREATE POLICY "Clinics can view their own analytics" ON public.booking_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_uid = auth.uid() 
      AND users.clinic_id = booking_analytics.clinic_id
    )
  );

-- سياسات Drafts
-- السماح للجميع بإضافة/تحديث المسودات
CREATE POLICY "Allow public insert/update drafts" ON public.booking_drafts
  FOR ALL USING (true) WITH CHECK (true); -- يمكن تقييدها أكثر بناءً على session_id لو أردنا

-- السماح لأصحاب العيادة برؤية المسودات
CREATE POLICY "Clinics can view their drafts" ON public.booking_drafts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_uid = auth.uid() 
      AND users.clinic_id = booking_drafts.clinic_id
    )
  );

-- سياسات Blocked Phones
-- أصحاب العيادة فقط يمكنهم إدارة الحظر
CREATE POLICY "Clinics manage blocked phones" ON public.blocked_phones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_uid = auth.uid() 
      AND users.clinic_id = blocked_phones.clinic_id
    )
  );

-- السماح للعامة (صفحة الحجز) بالقراءة للتحقق من الحظر (بدون كشف القائمة كاملة، فقط بالبحث المباشر لو أمكن، لكن للسهولة هنا Select)
-- ملاحظة: الأفضل استخدام دالة أمنية (Security Definer Function) للتحقق من الحظر بدلاً من فتح القراءة للعامة، للحفاظ على الخصوصية.
-- سنقوم بإنشاء دالة للتحقق من الحظر

CREATE OR REPLACE FUNCTION public.check_is_blocked(check_phone text, check_clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blocked_phones
    WHERE clinic_id = check_clinic_id
    AND phone_number = check_phone
  );
END;
$$;
