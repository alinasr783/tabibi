-- 1. جدول المحافظ (Clinic Wallets)
-- يخزن الرصيد الحالي لكل عيادة
CREATE TABLE public.clinic_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  balance numeric NOT NULL DEFAULT 0.00,
  currency text DEFAULT 'EGP',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clinic_wallets_pkey PRIMARY KEY (id),
  CONSTRAINT clinic_wallets_clinic_id_key UNIQUE (clinic_id)
);

-- 2. جدول سجل المعاملات (Wallet Transactions)
-- يسجل كل عملية إضافة أو خصم من الرصيد بالتفصيل
CREATE TABLE public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL,
  amount numeric NOT NULL, -- موجب للإيداع، سالب للخصم
  type text NOT NULL CHECK (type IN ('deposit', 'payment', 'refund', 'adjustment', 'bonus')),
  description text,
  reference_type text, -- نوع العملية المرتبطة: 'subscription', 'app_purchase', 'manual_deposit'
  reference_id text, -- معرف العملية المرتبطة (مثلاً id الاشتراك)
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.clinic_wallets(id)
);

-- 3. تفعيل الحماية (RLS) - اختياري حسب إعدادات السيرفر
ALTER TABLE public.clinic_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 4. كود لإنشاء محافظ لكل العيادات الموجودة حالياً (Run Once)
INSERT INTO public.clinic_wallets (clinic_id, balance)
SELECT DISTINCT clinic_id, 0 
FROM public.users 
WHERE clinic_id IS NOT NULL
ON CONFLICT (clinic_id) DO NOTHING;
