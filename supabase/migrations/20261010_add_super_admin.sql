-- Super Admin support: is_admin flag + helper + RLS bypass policies + audit log
-- نفّذ هذا الملف مرة واحدة من Supabase SQL Editor

-- 1) عمود التمييز (الطريقة المزدوجة: is_admin + role='super_admin')
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_is_admin
ON public.users (is_admin) WHERE is_admin = TRUE;

-- 2) دالة مساعدة لتجاوز RLS بدون recursion (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id::text = auth.uid()::text
      AND u.is_admin = TRUE
  );
$$;

-- 3) جدول سجل تدقيق الأدمن
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  admin_user_id text,
  action text NOT NULL,
  target_table text,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs (created_at DESC);
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_audit_logs' AND policyname='audit_insert_admin') THEN
    CREATE POLICY audit_insert_admin ON public.admin_audit_logs
      FOR INSERT WITH CHECK (public.is_super_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_audit_logs' AND policyname='audit_select_admin') THEN
    CREATE POLICY audit_select_admin ON public.admin_audit_logs
      FOR SELECT USING (public.is_super_admin());
  END IF;
END $$;

-- 4) سياسات تجاوز للسوبر أدمن (تُضاف بجانب السياسات الحالية ولا تحذفها)
-- users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_super_admin_all') THEN
    CREATE POLICY users_super_admin_all ON public.users
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- clinics
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clinics' AND policyname='clinics_super_admin_all') THEN
    CREATE POLICY clinics_super_admin_all ON public.clinics
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- subscriptions (اشتراكات الباقات)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subscriptions_super_admin_all') THEN
    CREATE POLICY subscriptions_super_admin_all ON public.subscriptions
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- app_subscriptions (اشتراكات التطبيقات)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='app_subscriptions' AND policyname='app_subscriptions_super_admin_all') THEN
    CREATE POLICY app_subscriptions_super_admin_all ON public.app_subscriptions
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- tabibi_apps (متجر التطبيقات)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tabibi_apps' AND policyname='tabibi_apps_super_admin_all') THEN
    CREATE POLICY tabibi_apps_super_admin_all ON public.tabibi_apps
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- plan_pricing (خطط الأسعار المعروضة)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plan_pricing' AND policyname='plan_pricing_super_admin_all') THEN
    CREATE POLICY plan_pricing_super_admin_all ON public.plan_pricing
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- plans (حدود الباقات)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plans' AND policyname='plans_super_admin_all') THEN
    CREATE POLICY plans_super_admin_all ON public.plans
      FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;
