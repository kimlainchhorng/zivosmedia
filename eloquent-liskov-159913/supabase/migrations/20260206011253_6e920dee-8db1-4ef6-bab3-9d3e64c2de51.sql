-- Fix the profile for kimlain@hizivo.com - the user_id should match the id
UPDATE public.profiles 
SET user_id = id 
WHERE user_id IS NULL AND id = '006839ef-8ea0-4c1f-bd69-147ea05b527c';

-- Also mark the allowlist entry as used
UPDATE public.signup_allowlist 
SET used_at = NOW() 
WHERE email = 'kimlain@hizivo.com';