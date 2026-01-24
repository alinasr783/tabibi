-- ==============================================================================
-- SAFE MIGRATION: Move Legacy Tabibi Apps to Marketplace Ecosystem V2
-- Idempotent, conflict-free, and compatible with partially applied schemas
-- ==============================================================================

BEGIN;

-- 0) Safety: Ensure required unique indexes exist for safe upserts
DO $$
BEGIN
  -- Unique index for slug in marketplace apps (needed for conflict detection)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uq_tabibi_marketplace_apps_slug'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uq_tabibi_marketplace_apps_slug ON public.tabibi_marketplace_apps(slug)';
  END IF;

  -- Unique index for installations (clinic_id, app_id)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uq_tabibi_app_installations_clinic_app'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uq_tabibi_app_installations_clinic_app ON public.tabibi_app_installations(clinic_id, app_id)';
  END IF;
END
$$;

-- 1) Ensure optional display columns exist on marketplace apps for richer UI
ALTER TABLE public.tabibi_marketplace_apps
  ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS screenshots jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preview_link text;

-- 2) Ensure a default system developer exists
INSERT INTO public.tabibi_developers (name, email, verification_status, developer_key)
SELECT 'Tabibi System', 'system@tabibi.site', 'verified', 'dev_system_official'
WHERE NOT EXISTS (SELECT 1 FROM public.tabibi_developers WHERE email = 'system@tabibi.site');

-- 3) Update existing marketplace rows from legacy data where slugs match
WITH dev AS (
  SELECT id FROM public.tabibi_developers WHERE email = 'system@tabibi.site' LIMIT 1
)
UPDATE public.tabibi_marketplace_apps m
SET title            = s.title,
    short_description= s.short_description,
    full_description = s.full_description,
    category         = s.category,
    icon_url         = s.image_url,
    cover_image_url  = COALESCE(m.cover_image_url, s.image_url),
    price_monthly    = s.price,
    is_paid          = (s.price > 0),
    features         = s.features,
    screenshots      = s.screenshots,
    preview_link     = s.preview_link,
    updated_at       = now()
FROM public.tabibi_apps s
WHERE m.slug = s.component_key
  AND s.component_key IS NOT NULL;

-- 4) Insert missing marketplace apps from legacy without ON CONFLICT
WITH dev AS (
  SELECT id FROM public.tabibi_developers WHERE email = 'system@tabibi.site' LIMIT 1
)
INSERT INTO public.tabibi_marketplace_apps
  (developer_id, title, slug, short_description, full_description, icon_url, cover_image_url, category, tags, is_paid, price_monthly, features, screenshots, preview_link, created_at, updated_at)
SELECT dev.id,
       s.title,
       s.component_key,
       s.short_description,
       s.full_description,
       s.image_url,
       s.image_url,
       s.category,
       ARRAY[s.category],
       (s.price > 0),
       s.price,
       s.features,
       s.screenshots,
       s.preview_link,
       now(),
       now()
FROM public.tabibi_apps s, dev
WHERE s.component_key IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.tabibi_marketplace_apps m WHERE m.slug = s.component_key
  );

-- 5) Create initial approved version for apps that lack any versions
INSERT INTO public.tabibi_app_versions (app_id, version_number, status, js_entry_point, changelog, created_at, published_at)
SELECT m.id,
       '1.0.0',
       'approved',
       m.slug,
       'Initial migration from legacy tabibi_apps',
       now(),
       now()
FROM public.tabibi_marketplace_apps m
WHERE NOT EXISTS (
  SELECT 1 FROM public.tabibi_app_versions v WHERE v.app_id = m.id
);

-- 6) Migrate legacy subscriptions into installations (idempotent)
INSERT INTO public.tabibi_app_installations (clinic_id, app_id, installed_version_id, status, trial_ends_at, current_period_end, is_frozen, settings, created_at, updated_at)
SELECT old_sub.clinic_id,
       m.id,
       (
         SELECT v.id
         FROM public.tabibi_app_versions v
         WHERE v.app_id = m.id
           AND v.status = 'approved'
         ORDER BY v.created_at DESC
         LIMIT 1
       ) AS installed_version_id,
       old_sub.status,
       NULL::timestamptz,
       old_sub.current_period_end,
       false,
       '{}'::jsonb,
       COALESCE(old_sub.created_at, now()),
       COALESCE(old_sub.updated_at, now())
FROM public.app_subscriptions old_sub
JOIN public.tabibi_apps s ON s.id = old_sub.app_id
JOIN public.tabibi_marketplace_apps m ON m.slug = s.component_key
ON CONFLICT (clinic_id, app_id) DO NOTHING;

COMMIT;

