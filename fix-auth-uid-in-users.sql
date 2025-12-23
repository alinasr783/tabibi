-- Fix missing auth_uid in users table
-- The issue: users.auth_uid is NULL or not matching auth.uid()
-- Solution: Update auth_uid to match the authentication UUID

-- Step 1: Check current state
SELECT 
    'Before Update' as status,
    id,
    email,
    user_id,
    auth_uid,
    CASE 
        WHEN auth_uid IS NULL THEN 'auth_uid is NULL'
        WHEN user_id IS NOT NULL THEN 'has user_id but need to map to auth_uid'
        ELSE 'unknown'
    END as issue
FROM users;

-- Step 2: Update auth_uid from user_id if possible
-- (assuming user_id contains the actual auth UUID)
UPDATE users
SET auth_uid = user_id::uuid
WHERE auth_uid IS NULL 
  AND user_id IS NOT NULL 
  AND user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 3: For current user, update manually if needed
-- Run this if you know your email:
-- UPDATE users 
-- SET auth_uid = auth.uid() 
-- WHERE email = 'YOUR_EMAIL_HERE';

-- Step 4: Verify the fix
SELECT 
    'After Update' as status,
    id,
    email,
    user_id,
    auth_uid,
    CASE 
        WHEN auth_uid IS NOT NULL THEN 'auth_uid is SET'
        ELSE 'auth_uid still NULL'
    END as status_check
FROM users;

-- Step 5: Test if the policy will work now
SELECT 
    'Policy Test After Fix' as info,
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_uid = auth.uid()
    ) as user_exists_now;
