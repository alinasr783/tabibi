-- 1. Fix column types in notifications table to match appointments/patients tables (BigInt instead of UUID)
DO $$ 
BEGIN
    -- Fix appointment_id type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'appointment_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE notifications DROP COLUMN appointment_id;
        ALTER TABLE notifications ADD COLUMN appointment_id bigint;
    END IF;

    -- Fix patient_id type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'patient_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE notifications DROP COLUMN patient_id;
        ALTER TABLE notifications ADD COLUMN patient_id bigint;
    END IF;
END $$;

-- 2. Create the Trigger Function to automatically create a notification on new appointment
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
        is_read,
        created_at,
        updated_at
    ) VALUES (
        NEW.clinic_id,
        'appointment',
        'حجز جديد', -- "New Booking" in Arabic
        CASE 
            WHEN patient_name IS NOT NULL THEN 'حجز جديد من المريض: ' || patient_name
            ELSE 'حجز جديد تم إضافته'
        END,
        NEW.id,
        NEW.patient_id,
        false,
        now(),
        now()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the Trigger on appointments table
DROP TRIGGER IF EXISTS on_new_appointment ON public.appointments;

CREATE TRIGGER on_new_appointment
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_appointment();
