-- ==============================================================================
-- MIGRATION: Move Legacy Tabibi Apps to New Ecosystem V2
-- ==============================================================================

-- 1. Create a Default System Developer
-- We need an owner for the existing apps.
INSERT INTO public.tabibi_developers (name, email, verification_status, developer_key)
VALUES ('Tabibi System', 'system@tabibi.site', 'verified', 'dev_system_official')
ON CONFLICT (email) DO NOTHING;

-- Get the Developer ID (assuming it's the one we just inserted or exists)
DO $$
DECLARE
    system_dev_id uuid;
BEGIN
    SELECT id INTO system_dev_id FROM public.tabibi_developers WHERE email = 'system@tabibi.site' LIMIT 1;

    -- 2. Migrate Apps from 'tabibi_apps' (Legacy) to 'tabibi_marketplace_apps' (New)
    -- We map 'component_key' to 'slug'
    INSERT INTO public.tabibi_marketplace_apps (
        developer_id,
        title,
        slug,
        short_description,
        full_description,
        icon_url,
        category,
        price_monthly,
        is_paid,
        tags,
        cover_image_url
    )
    SELECT 
        system_dev_id,
        title,
        component_key, -- slug
        short_description,
        full_description,
        image_url, -- icon
        category,
        price, -- monthly price
        CASE WHEN price > 0 THEN true ELSE false END, -- is_paid
        ARRAY[category], -- tags
        image_url -- cover image (using same as icon for now)
    FROM public.tabibi_apps
    WHERE component_key IS NOT NULL
    ON CONFLICT (slug) DO UPDATE 
    SET 
        title = EXCLUDED.title,
        price_monthly = EXCLUDED.price_monthly;

    -- 3. Create v1.0.0 Versions for Migrated Apps
    -- This ensures they appear in the store (which filters by having an approved version)
    INSERT INTO public.tabibi_app_versions (
        app_id,
        version_number,
        status,
        js_entry_point, -- We use the component key as a placeholder for now
        changelog,
        published_at
    )
    SELECT 
        new_app.id,
        '1.0.0',
        'approved',
        new_app.slug, -- In the new system, we might fetch code, but for now we keep the key reference
        'Initial migration from legacy system',
        now()
    FROM public.tabibi_marketplace_apps new_app
    WHERE NOT EXISTS (
        SELECT 1 FROM public.tabibi_app_versions v WHERE v.app_id = new_app.id
    );

    -- 4. Migrate Subscriptions
    -- Move data from 'app_subscriptions' to 'tabibi_app_installations'
    INSERT INTO public.tabibi_app_installations (
        clinic_id,
        app_id,
        installed_version_id,
        status,
        current_period_end
    )
    SELECT 
        old_sub.clinic_id,
        new_app.id,
        (SELECT id FROM public.tabibi_app_versions WHERE app_id = new_app.id LIMIT 1), -- Link to v1.0.0
        old_sub.status,
        old_sub.current_period_end
    FROM public.app_subscriptions old_sub
    JOIN public.tabibi_apps old_app ON old_sub.app_id = old_app.id
    JOIN public.tabibi_marketplace_apps new_app ON new_app.slug = old_app.component_key
    ON CONFLICT (clinic_id, app_id) DO NOTHING;

END $$;
