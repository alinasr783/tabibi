-- Fix financial_records table schema to support UUID for patient_id
-- This script will convert the patient_id column from bigint to UUID

-- Step 1: Drop existing constraints and indexes related to patient_id
ALTER TABLE financial_records DROP CONSTRAINT IF EXISTS financial_records_patient_id_fkey;
DROP INDEX IF EXISTS idx_financial_records_patient_id;

-- Step 2: Drop the old patient_id column (WARNING: This will delete all existing data in this column)
-- If you need to preserve data, export it first before running this script
ALTER TABLE financial_records DROP COLUMN IF EXISTS patient_id;

-- Step 3: Add the new patient_id column as UUID
ALTER TABLE financial_records ADD COLUMN patient_id UUID REFERENCES patients(id) ON DELETE SET NULL;

-- Step 4: Recreate the index on patient_id
CREATE INDEX idx_financial_records_patient_id ON financial_records(patient_id);

-- Step 5: Also ensure appointment_id and visit_id columns are UUID (they should already be)
-- Check appointment_id
DO $$ 
BEGIN
    -- Drop and recreate appointment_id as UUID if it's not already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_records' 
        AND column_name = 'appointment_id'
        AND data_type != 'uuid'
    ) THEN
        ALTER TABLE financial_records DROP COLUMN appointment_id;
        ALTER TABLE financial_records ADD COLUMN appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_financial_records_appointment_id ON financial_records(appointment_id);
    END IF;
END $$;

-- Check visit_id
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_records' 
        AND column_name = 'visit_id'
        AND data_type != 'uuid'
    ) THEN
        ALTER TABLE financial_records DROP COLUMN visit_id;
        ALTER TABLE financial_records ADD COLUMN visit_id UUID REFERENCES visits(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_financial_records_visit_id ON financial_records(visit_id);
    END IF;
END $$;

-- Verify the schema
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'financial_records'
ORDER BY ordinal_position;
