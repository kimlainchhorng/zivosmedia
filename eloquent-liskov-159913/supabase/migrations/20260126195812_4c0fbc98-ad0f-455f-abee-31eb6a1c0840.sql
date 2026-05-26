-- Add admin role to user
INSERT INTO public.user_roles (user_id, role)
VALUES ('2e0e7bfe-edda-4369-8c87-3ad82bb52b1d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Confirm user email so they can login
UPDATE auth.users 
SET email_confirmed_at = now()
WHERE id = '2e0e7bfe-edda-4369-8c87-3ad82bb52b1d';