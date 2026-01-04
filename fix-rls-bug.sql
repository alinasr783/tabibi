-- fix-rls-bug.sql
-- Fixes "No appointments appearing" issue caused by incorrect RLS policies
-- The issue: Policies were comparing auth.uid() (UUID) with users.id (BigInt)
-- The fix: Compare auth.uid() with users.user_id (Text/UUID)

-- 1. Fix USERS table policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users
FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data" ON users
FOR UPDATE USING (auth.uid()::text = user_id);

-- 2. Fix APPOINTMENTS table policies
DROP POLICY IF EXISTS "Users can read appointments from their clinic" ON appointments;
CREATE POLICY "Users can read appointments from their clinic" ON appointments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()::text
    AND u.clinic_id = appointments.clinic_id
  )
);

DROP POLICY IF EXISTS "Users can insert appointments to their clinic" ON appointments;
CREATE POLICY "Users can insert appointments to their clinic" ON appointments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()::text
    AND u.clinic_id = appointments.clinic_id
  )
);

DROP POLICY IF EXISTS "Users can update appointments from their clinic" ON appointments;
CREATE POLICY "Users can update appointments from their clinic" ON appointments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()::text
    AND u.clinic_id = appointments.clinic_id
  )
);

DROP POLICY IF EXISTS "Users can delete appointments from their clinic" ON appointments;
CREATE POLICY "Users can delete appointments from their clinic" ON appointments
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()::text
    AND u.clinic_id = appointments.clinic_id
  )
);

-- 3. Fix PATIENTS table policies
DROP POLICY IF EXISTS "Users can read patients from their clinic" ON patients;
CREATE POLICY "Users can read patients from their clinic" ON patients
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()::text
    AND u.clinic_id = patients.clinic_id
  )
);

DROP POLICY IF EXISTS "Users can insert patients to their clinic" ON patients;
CREATE POLICY "Users can insert patients to their clinic" ON patients
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()::text
    AND u.clinic_id = patients.clinic_id
  )
);

DROP POLICY IF EXISTS "Users can update patients from their clinic" ON patients;
CREATE POLICY "Users can update patients from their clinic" ON patients
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()::text
    AND u.clinic_id = patients.clinic_id
  )
);

DROP POLICY IF EXISTS "Users can delete patients from their clinic" ON patients;
CREATE POLICY "Users can delete patients from their clinic" ON patients
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()::text
    AND u.clinic_id = patients.clinic_id
  )
);

-- 4. Fix VISITS table policies
DROP POLICY IF EXISTS "Users can read visits from their clinic" ON visits;
CREATE POLICY "Users can read visits from their clinic" ON visits
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()::text
    AND u.clinic_id = visits.clinic_id
  )
);

DROP POLICY IF EXISTS "Users can insert visits to their clinic" ON visits;
CREATE POLICY "Users can insert visits to their clinic" ON visits
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()::text
    AND u.clinic_id = visits.clinic_id
  )
);

DROP POLICY IF EXISTS "Users can update visits from their clinic" ON visits;
CREATE POLICY "Users can update visits from their clinic" ON visits
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()::text
    AND u.clinic_id = visits.clinic_id
  )
);

DROP POLICY IF EXISTS "Users can delete visits from their clinic" ON visits;
CREATE POLICY "Users can delete visits from their clinic" ON visits
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()::text
    AND u.clinic_id = visits.clinic_id
  )
);

-- 5. Fix CLINICS table policies
-- Use clinic_uuid for mapping
DROP POLICY IF EXISTS "Doctors can read their clinic" ON clinics;
CREATE POLICY "Doctors can read their clinic" ON clinics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()::text
    AND u.role = 'doctor'
    AND u.clinic_id = clinics.clinic_uuid
  )
);

DROP POLICY IF EXISTS "Doctors can update their clinic" ON clinics;
CREATE POLICY "Doctors can update their clinic" ON clinics
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()::text
    AND u.role = 'doctor'
    AND u.clinic_id = clinics.clinic_uuid
  )
);

DROP POLICY IF EXISTS "Secretaries can read their clinic" ON clinics;
CREATE POLICY "Secretaries can read their clinic" ON clinics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.user_id = auth.uid()::text
    AND u.role = 'secretary'
    AND u.clinic_id = clinics.clinic_uuid
  )
);
