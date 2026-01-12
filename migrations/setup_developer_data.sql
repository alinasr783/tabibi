-- Helper Script to Setup Developer Data
-- Replace 'YOUR_EMAIL_HERE' with the email of the user you want to make a developer
-- Replace 'APP_COMPONENT_KEY' with the component key of the app you want to link (e.g., 'tabibi_profile')

DO $$
DECLARE
    target_email text := 'admin@tabibi.site'; -- CHANGE THIS TO YOUR EMAIL
    target_app_key text := 'tabibi_profile'; -- CHANGE THIS TO YOUR APP KEY
    
    v_user_id uuid;
    v_developer_id uuid;
    v_app_id bigint;
BEGIN
    -- 1. Get User ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', target_email;
    END IF;
    
    RAISE NOTICE 'Found User ID: %', v_user_id;

    -- 2. Create or Get Developer Profile
    INSERT INTO public.app_developers (user_id, name, email, status)
    VALUES (v_user_id, 'Tabibi Admin', target_email, 'approved')
    ON CONFLICT (user_id) DO UPDATE 
    SET status = 'approved'
    RETURNING id INTO v_developer_id;
    
    RAISE NOTICE 'Developer ID: %', v_developer_id;

    -- 3. Link App to Developer
    SELECT id INTO v_app_id FROM public.tabibi_apps WHERE component_key = target_app_key;
    
    IF v_app_id IS NOT NULL THEN
        UPDATE public.tabibi_apps 
        SET developer_id = v_developer_id 
        WHERE id = v_app_id;
        RAISE NOTICE 'Linked App % to Developer %', target_app_key, v_developer_id;
    ELSE
        RAISE NOTICE 'App with key % not found', target_app_key;
    END IF;

END $$;
