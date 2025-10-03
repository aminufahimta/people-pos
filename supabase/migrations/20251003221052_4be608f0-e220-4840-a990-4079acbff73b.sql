-- Update the first user to be super_admin (you can change this email if needed)
UPDATE public.user_roles
SET role = 'super_admin'::app_role
WHERE user_id = (
  SELECT id FROM auth.users ORDER BY created_at LIMIT 1
);