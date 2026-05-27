UPDATE public.profiles
SET display_brand_name = 'ZIVO',
    is_verified = true
WHERE id = (SELECT id FROM auth.users WHERE lower(email) = 'klainkonkat@gmail.com' LIMIT 1);