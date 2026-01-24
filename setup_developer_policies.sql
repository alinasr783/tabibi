BEGIN;
ALTER TABLE public.tabibi_developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabibi_marketplace_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabibi_app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabibi_app_schema_requests ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tabibi_developers' AND policyname='dev_select_self') THEN
EXECUTE 'CREATE POLICY dev_select_self ON public.tabibi_developers FOR SELECT USING (user_id = auth.uid())';
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tabibi_developers' AND policyname='dev_update_self') THEN
EXECUTE 'CREATE POLICY dev_update_self ON public.tabibi_developers FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tabibi_marketplace_apps' AND policyname='mpa_select_public') THEN
EXECUTE 'CREATE POLICY mpa_select_public ON public.tabibi_marketplace_apps FOR SELECT USING (true)';
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tabibi_marketplace_apps' AND policyname='mpa_insert_owner') THEN
EXECUTE 'CREATE POLICY mpa_insert_owner ON public.tabibi_marketplace_apps FOR INSERT WITH CHECK (developer_id IN (SELECT id FROM public.tabibi_developers WHERE user_id = auth.uid()))';
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tabibi_marketplace_apps' AND policyname='mpa_update_owner') THEN
EXECUTE 'CREATE POLICY mpa_update_owner ON public.tabibi_marketplace_apps FOR UPDATE USING (developer_id IN (SELECT id FROM public.tabibi_developers WHERE user_id = auth.uid())) WITH CHECK (developer_id IN (SELECT id FROM public.tabibi_developers WHERE user_id = auth.uid()))';
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tabibi_app_versions' AND policyname='versions_select_owner') THEN
EXECUTE 'CREATE POLICY versions_select_owner ON public.tabibi_app_versions FOR SELECT USING ((SELECT developer_id FROM public.tabibi_marketplace_apps WHERE id = app_id) IN (SELECT id FROM public.tabibi_developers WHERE user_id = auth.uid()))';
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tabibi_app_versions' AND policyname='versions_insert_owner') THEN
EXECUTE 'CREATE POLICY versions_insert_owner ON public.tabibi_app_versions FOR INSERT WITH CHECK ((SELECT developer_id FROM public.tabibi_marketplace_apps WHERE id = app_id) IN (SELECT id FROM public.tabibi_developers WHERE user_id = auth.uid()))';
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tabibi_app_versions' AND policyname='versions_update_owner_draft') THEN
EXECUTE 'CREATE POLICY versions_update_owner_draft ON public.tabibi_app_versions FOR UPDATE USING ((SELECT developer_id FROM public.tabibi_marketplace_apps WHERE id = app_id) IN (SELECT id FROM public.tabibi_developers WHERE user_id = auth.uid()) AND status IN (''draft'',''submitted'')) WITH CHECK ((SELECT developer_id FROM public.tabibi_marketplace_apps WHERE id = app_id) IN (SELECT id FROM public.tabibi_developers WHERE user_id = auth.uid()) AND status IN (''draft'',''submitted''))';
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tabibi_app_schema_requests' AND policyname='schema_requests_select_owner') THEN
EXECUTE 'CREATE POLICY schema_requests_select_owner ON public.tabibi_app_schema_requests FOR SELECT USING (developer_id IN (SELECT id FROM public.tabibi_developers WHERE user_id = auth.uid()))';
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tabibi_app_schema_requests' AND policyname='schema_requests_insert_owner') THEN
EXECUTE 'CREATE POLICY schema_requests_insert_owner ON public.tabibi_app_schema_requests FOR INSERT WITH CHECK (developer_id IN (SELECT id FROM public.tabibi_developers WHERE user_id = auth.uid()))';
END IF;
END
$$;
COMMIT;
