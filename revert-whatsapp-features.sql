-- SQL Script to Revert WhatsApp Features and Integrations
-- This script removes all tables, columns, and jobs associated with the WhatsApp API integration.

-- 1. Unschedule Cron Job
-- Attempts to unschedule 'send-whatsapp-reminders'. Safely handles cases where pg_cron is missing.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('send-whatsapp-reminders');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule cron job (it might not exist): %', SQLERRM;
END $$;

-- 2. Drop Tables
-- Drops tables and cascades to remove associated policies, indexes, and constraints.
DROP TABLE IF EXISTS public.whatsapp_message_logs CASCADE;
DROP TABLE IF EXISTS public.whatsapp_settings CASCADE;
DROP TABLE IF EXISTS public.integrations CASCADE;

-- 3. Remove Columns from Appointments Table
-- Removes the specific columns added for WhatsApp tracking.
ALTER TABLE public.appointments DROP COLUMN IF EXISTS whatsapp_booking_sent;
ALTER TABLE public.appointments DROP COLUMN IF EXISTS whatsapp_reminder_sent;
ALTER TABLE public.appointments DROP COLUMN IF EXISTS whatsapp_booking_message_id;
ALTER TABLE public.appointments DROP COLUMN IF EXISTS whatsapp_reminder_message_id;

-- Note: Extensions (pg_cron, pg_net) are NOT dropped by this script as they might be used by other features.
-- If you want to drop them, uncomment the lines below:
-- DROP EXTENSION IF EXISTS pg_cron;
-- DROP EXTENSION IF EXISTS pg_net;
