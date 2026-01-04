-- ====================================
-- Integrations System Schema
-- ====================================
-- This file contains the SQL schema for storing user integrations (Google Calendar, Tasks, etc.)
-- Execute these commands in your Supabase SQL Editor

-- Create integrations table
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID, -- Optional: link to clinic if the integration is shared
  
  -- Provider Info
  provider TEXT NOT NULL, -- e.g., 'google'
  integration_type TEXT NOT NULL, -- e.g., 'calendar', 'tasks', 'contacts', 'whatsapp'
  
  -- OAuth Data (Store securely)
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  token_type TEXT,
  id_token TEXT,
  
  -- Configuration & Status
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb, -- Store specific settings (e.g., selected calendar ID, sync preferences)
  metadata JSONB DEFAULT '{}'::jsonb, -- Store external IDs (e.g., google_user_id, email)
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  -- Ensure one integration type per user (or per clinic/user combo)
  CONSTRAINT unique_user_integration_type UNIQUE (user_id, provider, integration_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_clinic_id ON public.integrations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON public.integrations(provider);

-- Enable Row Level Security (RLS)
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Users can view own integrations'
  ) THEN
    CREATE POLICY "Users can view own integrations"
    ON public.integrations
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Users can insert own integrations'
  ) THEN
    CREATE POLICY "Users can insert own integrations"
    ON public.integrations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Users can update own integrations'
  ) THEN
    CREATE POLICY "Users can update own integrations"
    ON public.integrations
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Users can delete own integrations'
  ) THEN
    CREATE POLICY "Users can delete own integrations"
    ON public.integrations
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create trigger for updating timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_integrations_updated_at'
  ) THEN
    CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON public.integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
