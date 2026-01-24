-- ==============================================================================
-- Tabibi Apps Ecosystem V2 - Comprehensive Database Schema
-- ==============================================================================
-- 
-- This schema is designed to transform "Tabibi Apps" into a full-fledged 
-- "Google Play-like" ecosystem where developers can submit dynamic applications 
-- that run within a secure sandbox environment.
--
-- Core Concepts:
-- 1. Sandboxing: App code (JS/CSS) is stored in the DB, not hardcoded in the frontend.
-- 2. Versioning: Every app has multiple versions (Draft, Pending, Approved, Live).
-- 3. Permissions: Apps must request explicit scopes (e.g., 'patients.read').
-- 4. Custom Data: Developers can request custom SQL tables for their apps.
-- 5. Strict Monitoring: "Kill Switch" and Audit Logs are built-in.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. Master Permissions Table (Scopes)
-- ==============================================================================
-- Defines what an app is allowed to do. 
-- Examples: 'patients.read', 'appointments.write', 'events.listen.visit_completed'
CREATE TABLE IF NOT EXISTS public.tabibi_app_scopes (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  scope_code text NOT NULL UNIQUE, -- e.g. "patients.read"
  description text NOT NULL, -- e.g. "Allows the app to view patient details"
  category text NOT NULL, -- e.g. "Health Records", "Finance", "System"
  risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at timestamp with time zone DEFAULT now()
);

-- Seed initial scopes
INSERT INTO public.tabibi_app_scopes (scope_code, description, category, risk_level) VALUES
('patients.read', 'Access to read patient names and basic info', 'Patients', 'medium'),
('patients.write', 'Ability to create or edit patient records', 'Patients', 'high'),
('appointments.read', 'View clinic schedule and appointments', 'Appointments', 'low'),
('appointments.write', 'Create or cancel appointments', 'Appointments', 'medium'),
('financials.read', 'View clinic revenue and transaction history', 'Finance', 'critical'),
('events.subscribe', 'Listen to system events like New Booking', 'System', 'medium')
ON CONFLICT (scope_code) DO NOTHING;


-- ==============================================================================
-- 2. Developers Profile (Enhanced)
-- ==============================================================================
-- Links a system user to a Developer Identity
CREATE TABLE IF NOT EXISTS public.tabibi_developers (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id), -- Link to Supabase Auth
  name text NOT NULL, -- Developer or Company Name
  email text NOT NULL,
  website text,
  verification_status text DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'suspended')),
  developer_key text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'), -- Public ID for the developer
  created_at timestamp with time zone DEFAULT now()
);


-- ==============================================================================
-- 3. Apps Registry (The Storefront)
-- ==============================================================================
-- The "Face" of the app. Does not contain code, only metadata.
-- Note: Replaces or Enhances existing 'tabibi_apps'
CREATE TABLE IF NOT EXISTS public.tabibi_marketplace_apps (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  developer_id uuid NOT NULL REFERENCES public.tabibi_developers(id),
  
  -- Metadata
  title text NOT NULL,
  slug text UNIQUE NOT NULL, -- URL friendly name (e.g. 'inventory-manager')
  short_description text,
  full_description text,
  icon_url text,
  cover_image_url text,
  category text, -- 'Marketing', 'Clinical', 'Finance'
  tags text[],
  
  -- Commercials
  is_paid boolean DEFAULT false,
  price_monthly numeric DEFAULT 0,
  price_yearly numeric DEFAULT 0,
  has_free_trial boolean DEFAULT false,
  trial_days integer DEFAULT 0,
  
  -- Security & Control
  is_featured boolean DEFAULT false,
  kill_switch_active boolean DEFAULT false, -- If TRUE, app is disabled globally immediately
  kill_switch_reason text,
  
  -- Stats
  install_count bigint DEFAULT 0,
  average_rating numeric(3,2) DEFAULT 0.00,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);


-- ==============================================================================
-- 4. App Versions (The Code)
-- ==============================================================================
-- Stores the actual implementation. This allows "Rollbacks" and "Review Workflows".
CREATE TABLE IF NOT EXISTS public.tabibi_app_versions (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  app_id bigint NOT NULL REFERENCES public.tabibi_marketplace_apps(id) ON DELETE CASCADE,
  
  version_number text NOT NULL, -- e.g. "1.0.2"
  
  -- The Sandbox Code
  -- We store code as text. In a real scenario, this might be a URL to a storage bucket,
  -- but for "Database as Backend" architecture, text columns work fine for < 1MB bundles.
  js_entry_point text, -- The main JavaScript code (React Component)
  css_bundle text, -- Styles
  
  -- Review Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'archived')),
  reviewer_notes text,
  rejection_reason text,
  
  changelog text,
  
  created_at timestamp with time zone DEFAULT now(),
  published_at timestamp with time zone
);

-- Unique constraint to prevent duplicate versions for same app
CREATE UNIQUE INDEX idx_app_versions_number ON public.tabibi_app_versions(app_id, version_number);


-- ==============================================================================
-- 5. Version Permissions (Manifest)
-- ==============================================================================
-- Links specific versions to required permissions.
-- If v2.0 requires "financials.read" but v1.0 didn't, the user must re-consent.
CREATE TABLE IF NOT EXISTS public.tabibi_app_version_scopes (
  version_id uuid NOT NULL REFERENCES public.tabibi_app_versions(id) ON DELETE CASCADE,
  scope_id uuid NOT NULL REFERENCES public.tabibi_app_scopes(id),
  justification text, -- Why does the app need this?
  PRIMARY KEY (version_id, scope_id)
);


-- ==============================================================================
-- 6. Custom Data Schema Requests
-- ==============================================================================
-- Allows developers to request custom SQL tables.
-- The system admin reviews the SQL and applies it manually or via a safe runner.
CREATE TABLE IF NOT EXISTS public.tabibi_app_schema_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  app_id bigint NOT NULL REFERENCES public.tabibi_marketplace_apps(id),
  developer_id uuid NOT NULL REFERENCES public.tabibi_developers(id),
  
  table_name text NOT NULL, -- Requested table name (will be prefixed, e.g. app_123_custom)
  sql_structure text NOT NULL, -- The CREATE TABLE statement
  purpose text NOT NULL,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'applied', 'rejected')),
  admin_response text,
  
  created_at timestamp with time zone DEFAULT now()
);


-- ==============================================================================
-- 7. Installations & Subscriptions
-- ==============================================================================
-- Tracks which clinic has which app installed.
CREATE TABLE IF NOT EXISTS public.tabibi_app_installations (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  clinic_id uuid NOT NULL, -- References the clinics table (assuming clinic_uuid)
  app_id bigint NOT NULL REFERENCES public.tabibi_marketplace_apps(id),
  
  -- Version Tracking
  installed_version_id uuid REFERENCES public.tabibi_app_versions(id),
  auto_update boolean DEFAULT true,
  
  -- Subscription Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'suspended')),
  trial_ends_at timestamp with time zone,
  current_period_end timestamp with time zone,
  
  -- Security
  is_frozen boolean DEFAULT false, -- If admin freezes this specific installation
  
  settings jsonb DEFAULT '{}'::jsonb, -- App-specific user settings
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  UNIQUE(clinic_id, app_id)
);


-- ==============================================================================
-- 8. Audit Logs (The Black Box)
-- ==============================================================================
-- Records every sensitive action taken by an app.
CREATE TABLE IF NOT EXISTS public.tabibi_app_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  app_id bigint NOT NULL,
  clinic_id uuid NOT NULL,
  action text NOT NULL, -- e.g. 'read_patient', 'export_data'
  resource text, -- e.g. 'Patient: #123'
  metadata jsonb,
  severity text DEFAULT 'info',
  timestamp timestamp with time zone DEFAULT now()
);


-- ==============================================================================
-- 9. Reviews & Ratings
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tabibi_app_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  app_id bigint NOT NULL REFERENCES public.tabibi_marketplace_apps(id),
  clinic_id uuid NOT NULL,
  user_id uuid NOT NULL, -- The specific doctor who reviewed
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_verified_purchase boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);


-- ==============================================================================
-- 10. Webhooks / Events System
-- ==============================================================================
-- Allows apps to register for system events
CREATE TABLE IF NOT EXISTS public.tabibi_app_event_subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  app_id bigint NOT NULL REFERENCES public.tabibi_marketplace_apps(id),
  event_type text NOT NULL, -- e.g. 'patient.created'
  handler_function_name text, -- Internal function name to call in the sandbox
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);


-- ==============================================================================
-- Helper Views for Easy Access
-- ==============================================================================

-- View: Active Store Apps (Only approved and published)
CREATE OR REPLACE VIEW view_marketplace_storefront AS
SELECT 
  app.id,
  app.title,
  app.short_description,
  app.icon_url,
  app.price_monthly,
  app.has_free_trial,
  app.average_rating,
  dev.name as developer_name,
  ver.version_number as latest_version
FROM tabibi_marketplace_apps app
JOIN tabibi_developers dev ON app.developer_id = dev.id
LEFT JOIN LATERAL (
  SELECT version_number FROM tabibi_app_versions 
  WHERE app_id = app.id AND status = 'approved' 
  ORDER BY created_at DESC LIMIT 1
) ver ON true
WHERE app.kill_switch_active = false 
  AND ver.version_number IS NOT NULL;
