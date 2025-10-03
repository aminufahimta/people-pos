-- Link related tables to profiles so embedded selects work
-- 1) user_roles.user_id -> profiles.id
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2) salary_info.user_id -> profiles.id (unique per user)
ALTER TABLE public.salary_info
DROP CONSTRAINT IF EXISTS salary_info_user_id_fkey;
ALTER TABLE public.salary_info
ADD CONSTRAINT salary_info_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.salary_info
DROP CONSTRAINT IF EXISTS salary_info_user_id_unique;
ALTER TABLE public.salary_info
ADD CONSTRAINT salary_info_user_id_unique UNIQUE (user_id);

-- 3) attendance.user_id -> profiles.id
ALTER TABLE public.attendance
DROP CONSTRAINT IF EXISTS attendance_user_id_fkey;
ALTER TABLE public.attendance
ADD CONSTRAINT attendance_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;