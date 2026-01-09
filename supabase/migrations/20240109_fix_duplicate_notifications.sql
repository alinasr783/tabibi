-- Fix duplicate notifications issue and ensure correct schema

-- 1. Ensure fcm_tokens table exists (for push notifications settings)
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    token text NOT NULL,
    device_type text DEFAULT 'web',
    created_at timestamp with time zone DEFAULT now(),
    last_updated timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, token)
);

-- Enable RLS for fcm_tokens
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Re-create policies for fcm_tokens to ensure they exist and are correct
DROP POLICY IF EXISTS "Users can insert their own tokens" ON public.fcm_tokens;
DROP POLICY IF EXISTS "Users can view their own tokens" ON public.fcm_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON public.fcm_tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON public.fcm_tokens;

CREATE POLICY "Users can insert their own tokens" ON public.fcm_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own tokens" ON public.fcm_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own tokens" ON public.fcm_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tokens" ON public.fcm_tokens FOR DELETE USING (auth.uid() = user_id);


-- 2. Fix Duplicate Notifications Triggers

-- Drop BOTH potential existing triggers to ensure clean slate
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
DROP TRIGGER IF EXISTS on_new_appointment ON public.appointments;

-- Ensure related_id exists in notifications table (useful for linking)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'related_id'
    ) THEN
        ALTER TABLE notifications ADD COLUMN related_id text;
    END IF;
END $$;

-- Create or Replace the notification trigger function
CREATE OR REPLACE FUNCTION public.handle_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    patient_name text;
BEGIN
    -- Get patient name if available
    IF NEW.patient_id IS NOT NULL THEN
        SELECT name INTO patient_name FROM public.patients WHERE id = NEW.patient_id;
    END IF;

    -- Insert notification
    INSERT INTO public.notifications (
        clinic_id,
        type,
        title,
        message,
        appointment_id,
        patient_id,
        related_id,
        is_read,
        created_at,
        updated_at
    ) VALUES (
        NEW.clinic_id,
        'appointment',
        'حجز جديد',
        CASE 
            WHEN patient_name IS NOT NULL THEN 'حجز جديد من المريض: ' || patient_name
            ELSE 'حجز جديد تم إضافته'
        END,
        NEW.id,
        NEW.patient_id,
        NEW.id::text, -- Populate related_id for compatibility
        false,
        now(),
        now()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the SINGLE trigger
CREATE TRIGGER on_new_appointment
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_appointment();

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
