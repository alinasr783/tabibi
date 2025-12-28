-- ====================================
-- User Personalization Schema
-- ====================================
-- This migration adds user preferences table for customizing colors, theme, and menu order
-- Execute these commands in your Supabase SQL Editor

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Theme & Color Customization
  theme_mode TEXT DEFAULT 'system' CHECK (theme_mode IN ('light', 'dark', 'system')),
  primary_color VARCHAR(7) DEFAULT '#1AA19C',  -- Hex color code
  secondary_color VARCHAR(7) DEFAULT '#224FB5',
  accent_color VARCHAR(7) DEFAULT '#FF6B6B',
  
  -- Brand Customization
  logo_url TEXT,  -- Custom logo URL
  company_name TEXT,  -- Custom branding name
  
  -- Menu & Layout
  menu_items JSONB DEFAULT '[]'::jsonb,  -- Custom menu order: [{"id": "dashboard", "label": "لوحة التحكم", "order": 1, "enabled": true}, ...]
  sidebar_collapsed BOOLEAN DEFAULT false,
  sidebar_style TEXT DEFAULT 'default' CHECK (sidebar_style IN ('default', 'compact', 'full')),
  
  -- Localization
  language TEXT DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
  
  -- Notification Preferences
  notifications_enabled BOOLEAN DEFAULT true,
  sound_notifications BOOLEAN DEFAULT true,
  
  -- Dashboard Customization
  dashboard_widgets JSONB DEFAULT '[]'::jsonb,  -- Custom widget order: [{"id": "widget_name", "order": 1, "enabled": true}, ...]
  
  -- Created & Updated timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own preferences
CREATE POLICY "Users can read own preferences"
ON user_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences"
ON user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
ON user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own preferences"
ON user_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create default preferences trigger - automatically create preferences for new users
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_preferences_on_user_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_preferences();
