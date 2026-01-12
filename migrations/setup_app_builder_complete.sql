-- Comprehensive Migration for App Builder Dashboard
-- Run this in Supabase SQL Editor

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
DROP POLICY IF EXISTS "Developers can view own profile" ON public.app_developers;
CREATE POLICY "Developers can view own profile" ON public.app_developers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Developers can update own profile" ON public.app_developers;
CREATE POLICY "Developers can update own profile" ON public.app_developers
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Developers can insert own profile" ON public.app_developers;
CREATE POLICY "Developers can insert own profile" ON public.app_developers
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 2. Create App Data Submissions Table
CREATE TABLE IF NOT EXISTS public.app_data_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  app_id bigint NOT NULL,
  clinic_id uuid, -- Optional link to clinic if known by ID
  submission_type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text DEFAULT 'new',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_data_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT app_data_submissions_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.tabibi_apps(id)
);

-- Add Foreign Key to clinics safely
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinics') THEN
        -- Check if 'id' column exists in clinics
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'id') THEN
             -- Only add constraint if it doesn't exist
             IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'app_data_submissions_clinic_id_fkey') THEN
                 ALTER TABLE public.app_data_submissions 
                 ADD CONSTRAINT app_data_submissions_clinic_id_fkey 
                 FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);
             END IF;
        END IF;
    END IF;
END $$;

ALTER TABLE public.app_data_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for app_data_submissions
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


-- 3. Update Tabibi Apps Table
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
DROP POLICY IF EXISTS "Developers can update own apps" ON public.tabibi_apps;
CREATE POLICY "Developers can update own apps" ON public.tabibi_apps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.app_developers
      WHERE app_developers.id = tabibi_apps.developer_id
      AND app_developers.user_id = auth.uid()
    )
  );
