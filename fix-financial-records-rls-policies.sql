-- Fix RLS policies for financial_records table
-- Problem 1: policies compare users.clinic_id (UUID) with financial_records.clinic_id (bigint)
-- Problem 2: policies use u.id (bigint) instead of u.auth_uid (UUID) to match auth.uid()
-- Solution: Use users.auth_uid for authentication and clinic_id_bigint for clinic matching

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read financial records from their clinic" ON financial_records;
DROP POLICY IF EXISTS "Users can insert financial records to their clinic" ON financial_records;
DROP POLICY IF EXISTS "Users can update financial records from their clinic" ON financial_records;
DROP POLICY IF EXISTS "Users can delete financial records from their clinic" ON financial_records;

-- Create new policies using auth_uid and clinic_id_bigint
CREATE POLICY "Users can read financial records from their clinic"
ON financial_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_uid = auth.uid()
    AND (
      u.clinic_id_bigint = financial_records.clinic_id
      OR (
        -- Fallback: if clinic_id_bigint is NULL, try to match via clinics table
        u.clinic_id_bigint IS NULL 
        AND EXISTS (
          SELECT 1 FROM clinics c 
          WHERE c.clinic_uuid = u.clinic_id 
          AND (c.clinic_id_bigint = financial_records.clinic_id OR c.id = financial_records.clinic_id)
        )
      )
    )
  )
);

CREATE POLICY "Users can insert financial records to their clinic"
ON financial_records
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_uid = auth.uid()
    AND (
      u.clinic_id_bigint = financial_records.clinic_id
      OR (
        -- Fallback: if clinic_id_bigint is NULL, try to match via clinics table
        u.clinic_id_bigint IS NULL 
        AND EXISTS (
          SELECT 1 FROM clinics c 
          WHERE c.clinic_uuid = u.clinic_id 
          AND (c.clinic_id_bigint = financial_records.clinic_id OR c.id = financial_records.clinic_id)
        )
      )
    )
  )
);

CREATE POLICY "Users can update financial records from their clinic"
ON financial_records
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_uid = auth.uid()
    AND (
      u.clinic_id_bigint = financial_records.clinic_id
      OR (
        -- Fallback: if clinic_id_bigint is NULL, try to match via clinics table
        u.clinic_id_bigint IS NULL 
        AND EXISTS (
          SELECT 1 FROM clinics c 
          WHERE c.clinic_uuid = u.clinic_id 
          AND (c.clinic_id_bigint = financial_records.clinic_id OR c.id = financial_records.clinic_id)
        )
      )
    )
  )
);

CREATE POLICY "Users can delete financial records from their clinic"
ON financial_records
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_uid = auth.uid()
    AND (
      u.clinic_id_bigint = financial_records.clinic_id
      OR (
        -- Fallback: if clinic_id_bigint is NULL, try to match via clinics table
        u.clinic_id_bigint IS NULL 
        AND EXISTS (
          SELECT 1 FROM clinics c 
          WHERE c.clinic_uuid = u.clinic_id 
          AND (c.clinic_id_bigint = financial_records.clinic_id OR c.id = financial_records.clinic_id)
        )
      )
    )
  )
);

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'financial_records'
ORDER BY policyname;
