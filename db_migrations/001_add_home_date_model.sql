-- Migration: add home_date_model to user_preferences
-- Purpose: store user preference for how to render the "Your appointments today" section on Overview
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS home_date_model text NOT NULL DEFAULT 'days' CHECK (home_date_model IN ('days','date'));
