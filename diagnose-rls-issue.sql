-- Diagnostic script to find the RLS issue

-- 1. Check current user authentication
SELECT 
    'Current Auth User' as info,
    auth.uid() as auth_uid,
    auth.email() as auth_email;

-- 2. Check users table data
SELECT 
    'Users Table Data' as info,
    id,
    auth_uid,
    email,
    clinic_id,
    clinic_id_bigint,
    user_id,
    role
FROM users 
WHERE auth_uid = auth.uid();

-- 3. Check if clinic_id_bigint is populated
SELECT 
    'Clinic ID Status' as info,
    CASE 
        WHEN clinic_id_bigint IS NOT NULL THEN 'HAS clinic_id_bigint'
        WHEN clinic_id IS NOT NULL THEN 'HAS clinic_id (UUID) but NO clinic_id_bigint'
        ELSE 'NO clinic info'
    END as status,
    clinic_id_bigint,
    clinic_id
FROM users 
WHERE auth_uid = auth.uid();

-- 4. Check clinics table to get clinic_id_bigint
SELECT 
    'Clinics Table Data' as info,
    c.id as clinic_table_id,
    c.clinic_uuid,
    c.clinic_id_bigint,
    c.name
FROM clinics c
WHERE c.clinic_uuid = (
    SELECT u.clinic_id 
    FROM users u 
    WHERE u.auth_uid = auth.uid()
);

-- 5. Test the policy condition manually
SELECT 
    'Policy Test' as info,
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_uid = auth.uid()
    ) as user_exists,
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_uid = auth.uid()
        AND u.clinic_id_bigint IS NOT NULL
    ) as has_clinic_id_bigint,
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_uid = auth.uid()
        AND u.clinic_id_bigint IS NULL
        AND EXISTS (
            SELECT 1 FROM clinics c 
            WHERE c.clinic_uuid = u.clinic_id
        )
    ) as fallback_works;

-- 6. Get the clinic_id_bigint value that should be used
SELECT 
    'Expected clinic_id_bigint' as info,
    COALESCE(
        u.clinic_id_bigint,
        c.clinic_id_bigint,
        c.id
    ) as clinic_id_bigint_to_use
FROM users u
LEFT JOIN clinics c ON c.clinic_uuid = u.clinic_id
WHERE u.auth_uid = auth.uid();
