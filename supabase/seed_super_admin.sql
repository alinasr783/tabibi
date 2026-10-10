-- Seed أول Super Admin — نفّذ بعد migration بنجاح من Supabase SQL Editor
-- البريد: alinasreldin783@gmail.com

UPDATE public.users
SET is_admin = TRUE, role = 'super_admin'
WHERE email = 'alinasreldin783@gmail.com';

-- تحقق (يجب أن يرجع صفاً واحداً)
SELECT user_id, email, name, role, is_admin
FROM public.users
WHERE email = 'alinasreldin783@gmail.com';
