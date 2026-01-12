-- Fixed Migration for App Builder Dashboard
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Create App Developers Table
CREATE TABLE IF NOT EXISTS public.app_developers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- Link to auth.users
  name text NOT NULL,
  company_name text,
  email text NOT NULL,
  phone text,
  website text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  api_key text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_developers_pkey PRIMARY KEY (id),
  CONSTRAINT app_developers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT app_developers_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.app_developers ENABLE ROW LEVEL SECURITY;

-- Policies for app_developers
DO $$
BEGIN
    DROP POLICY IF EXISTS "Developers can view own profile" ON public.app_developers;
    CREATE POLICY "Developers can view own profile" ON public.app_developers
      FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Developers can update own profile" ON public.app_developers;
    CREATE POLICY "Developers can update own profile" ON public.app_developers
      FOR UPDATE USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Developers can insert own profile" ON public.app_developers;
    CREATE POLICY "Developers can insert own profile" ON public.app_developers
      FOR INSERT WITH CHECK (auth.uid() = user_id);
END $$;

-- 2. Update Tabibi Apps Table
DO $$
BEGIN
    -- Add developer_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tabibi_apps' AND column_name = 'developer_id') THEN
        ALTER TABLE public.tabibi_apps ADD COLUMN developer_id uuid;
        ALTER TABLE public.tabibi_apps ADD CONSTRAINT tabibi_apps_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES public.app_developers(id);
    END IF;

    -- Add submission_schema
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tabibi_apps' AND column_name = 'submission_schema') THEN
        ALTER TABLE public.tabibi_apps ADD COLUMN submission_schema jsonb DEFAULT '{}'::jsonb;
    END IF;

    -- Add preview_link
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tabibi_apps' AND column_name = 'preview_link') THEN
        ALTER TABLE public.tabibi_apps ADD COLUMN preview_link text;
    END IF;
END $$;

-- Policies for tabibi_apps (Developers)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Developers can update own apps" ON public.tabibi_apps;
    CREATE POLICY "Developers can update own apps" ON public.tabibi_apps
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.app_developers
          WHERE app_developers.id = tabibi_apps.developer_id
          AND app_developers.user_id = auth.uid()
        )
      );
END $$;

-- 3. Ensure clinics.clinic_uuid is unique to allow Foreign Key reference
-- We try to add a unique constraint if it doesn't exist.
-- If duplicates exist, this might fail, so we wrap it in a block or just attempt it.
-- However, for the FK to work, this MUST succeed.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'clinics' AND constraint_type = 'UNIQUE' AND constraint_name = 'clinics_clinic_uuid_key'
    ) THEN
        -- Only attempt if there are no duplicates (optional check, but Postgres will throw error anyway)
        ALTER TABLE public.clinics ADD CONSTRAINT clinics_clinic_uuid_key UNIQUE (clinic_uuid);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add unique constraint to clinics.clinic_uuid. Foreign key in app_data_submissions might fail if not referencing a unique column.';
END $$;

-- 4. Create App Data Submissions Table
CREATE TABLE IF NOT EXISTS public.app_data_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  app_id bigint NOT NULL,
  clinic_id uuid, -- Link to clinic via UUID
  submission_type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text DEFAULT 'new',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_data_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT app_data_submissions_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.tabibi_apps(id)
);

-- Add Foreign Key to clinics safely (Referencing clinic_uuid, NOT id)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinics') THEN
         IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'app_data_submissions_clinic_id_fkey') THEN
             -- Check if clinic_uuid is unique before adding FK
             IF EXISTS (
                 SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'clinics' AND constraint_type = 'UNIQUE' AND constraint_name = 'clinics_clinic_uuid_key'
             ) THEN
                 ALTER TABLE public.app_data_submissions 
                 ADD CONSTRAINT app_data_submissions_clinic_id_fkey 
                 FOREIGN KEY (clinic_id) REFERENCES public.clinics(clinic_uuid);
             ELSE
                 RAISE NOTICE 'Skipping FK app_data_submissions_clinic_id_fkey because clinics.clinic_uuid is not unique.';
             END IF;
         END IF;
    END IF;
END $$;

ALTER TABLE public.app_data_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for app_data_submissions
DO $$
BEGIN
    DROP POLICY IF EXISTS "Developers can view submissions for their apps" ON public.app_data_submissions;
    CREATE POLICY "Developers can view submissions for their apps" ON public.app_data_submissions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.tabibi_apps
          JOIN public.app_developers ON tabibi_apps.developer_id = app_developers.id
          WHERE tabibi_apps.id = app_data_submissions.app_id
          AND app_developers.user_id = auth.uid()
        )
      );
END $$;

COMMIT;
