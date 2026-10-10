-- خصم مباشر على الباقات في plan_pricing (يُدار من لوحة Super Admin)
-- نفّذ هذا الملف مرة واحدة من Supabase SQL Editor
-- السعر الأساسي يبقى في عمود price دائماً، والخصم أعمدة منفصلة

ALTER TABLE public.plan_pricing
ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'none'
  CHECK (discount_type IN ('none', 'percent', 'fixed'));

ALTER TABLE public.plan_pricing
ADD COLUMN IF NOT EXISTS discount_value numeric NOT NULL DEFAULT 0;

ALTER TABLE public.plan_pricing
ADD COLUMN IF NOT EXISTS discount_ends_at timestamptz NULL;

-- لا حاجة لسياسات RLS جديدة: الأعمدة تُقرأ/تُكتب بنفس سياسات plan_pricing الحالية
-- (القراءة العامة + الكتابة للسوبر أدمن عبر سياسة plan_pricing_super_admin_all)
