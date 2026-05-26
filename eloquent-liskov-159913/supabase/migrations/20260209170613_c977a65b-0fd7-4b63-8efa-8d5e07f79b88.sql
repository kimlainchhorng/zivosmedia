INSERT INTO public.user_roles (user_id, role)
SELECT '2e0e7bfe-edda-4369-8c87-3ad82bb52b1d', r::app_role
FROM unnest(ARRAY['moderator','user','super_admin','operations','finance','support','merchant','owner','manager']) AS r
ON CONFLICT (user_id, role) DO NOTHING;