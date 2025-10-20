-- Add approval status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN approved_by UUID REFERENCES auth.users(id),
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;

-- Update RLS policies to check approval status
CREATE POLICY "Unapproved users can only view own profile"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  AND (is_approved = TRUE OR is_approved IS NULL)
);

-- Allow HR and admins to see all profiles including unapproved ones
DROP POLICY IF EXISTS "HR and Super Admin can view all profiles" ON public.profiles;

CREATE POLICY "HR and Super Admin can view all profiles including unapproved"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'hr_manager'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);