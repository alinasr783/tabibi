-- Create App Developers Table
CREATE TABLE public.app_developers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- Link to auth.users
  name text NOT NULL,
  company_name text,
  email text NOT NULL,
  phone text,
  website text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  api_key text UNIQUE, -- For future API access
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_developers_pkey PRIMARY KEY (id),
  CONSTRAINT app_developers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT app_developers_user_id_unique UNIQUE (user_id)
);

-- Enable RLS for app_developers
ALTER TABLE public.app_developers ENABLE ROW LEVEL SECURITY;

-- Create App Data Submissions Table
CREATE TABLE public.app_data_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  app_id bigint NOT NULL,
  clinic_id uuid NOT NULL,
  submission_type text NOT NULL, -- e.g., 'new_order', 'booking_request'
  data jsonb NOT NULL DEFAULT '{}'::jsonb, -- The actual data payload
  status text DEFAULT 'new',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_data_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT app_data_submissions_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.tabibi_apps(id),
  CONSTRAINT app_data_submissions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(clinic_uuid)
);

-- Enable RLS for app_data_submissions
ALTER TABLE public.app_data_submissions ENABLE ROW LEVEL SECURITY;

-- Update Tabibi Apps Table
ALTER TABLE public.tabibi_apps 
ADD COLUMN developer_id uuid,
ADD COLUMN submission_schema jsonb DEFAULT '{}'::jsonb, -- To validate incoming data
ADD CONSTRAINT tabibi_apps_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES public.app_developers(id);
