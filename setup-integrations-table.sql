CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID,
  provider TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  token_type TEXT,
  id_token TEXT,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_integration_type UNIQUE (user_id, provider, integration_type)
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_integrations_clinic_id ON public.integrations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON public.integrations(provider);

DROP POLICY IF EXISTS "Users can view own integrations" ON public.integrations;
CREATE POLICY "Users can view own integrations" ON public.integrations
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own integrations" ON public.integrations;
CREATE POLICY "Users can insert own integrations" ON public.integrations
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own integrations" ON public.integrations;
CREATE POLICY "Users can update own integrations" ON public.integrations
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own integrations" ON public.integrations;
CREATE POLICY "Users can delete own integrations" ON public.integrations
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view clinic integrations" ON public.integrations;
CREATE POLICY "Users can view clinic integrations" ON public.integrations
FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.users WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update clinic integrations" ON public.integrations;
CREATE POLICY "Users can update clinic integrations" ON public.integrations
FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.users WHERE user_id = auth.uid()
  )
);
