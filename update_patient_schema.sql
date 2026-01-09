-- 1. تحديث جدول المرضى لإضافة الحقول الجديدة
-- نستخدم JSONB للحقول المركبة (التاريخ الطبي، التأمين) للحفاظ على مرونة البيانات
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS job text,
ADD COLUMN IF NOT EXISTS marital_status text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS age_unit text DEFAULT 'years',
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS medical_history jsonb DEFAULT '{}'::jsonb,
-- medical_history structure:
-- {
--   "chief_complaint": "...",
--   "chronic_diseases": ["...", "..."],
--   "blood_pressure": "120/80",
--   "blood_sugar": "...",
--   "allergies": ["...", "..."],
--   "past_surgeries": ["...", "..."],
--   "family_history": ["...", "..."]
-- }
ADD COLUMN IF NOT EXISTS insurance_info jsonb DEFAULT '{}'::jsonb;
-- insurance_info structure:
-- {
--   "provider_name": "...",
--   "policy_number": "...",
--   "coverage_percent": 80
-- }

-- 2. إنشاء جدول للمرفقات والوثائق
CREATE TABLE IF NOT EXISTS public.patient_attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  patient_id bigint REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id uuid,
  file_name text,
  file_url text NOT NULL,
  file_type text, -- 'image', 'pdf', 'lab_result', etc.
  category text, -- 'xray', 'lab', 'prescription', 'other'
  description text
);

-- إضافة الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_patient_attachments_patient_id ON public.patient_attachments(patient_id);
