-- Drop all existing restrictive policies on profiles table
DROP POLICY IF EXISTS "HR and Super Admin can view all profiles including unapproved" ON public.profiles;
DROP POLICY IF EXISTS "HR can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Unapproved users can only view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create PERMISSIVE policies that explicitly allow only authorized access patterns

-- SELECT policies (PERMISSIVE - at least one must pass)
CREATE POLICY "Users can view own profile" 
ON public.profiles 
AS PERMISSIVE
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "HR and Super Admin can view all profiles" 
ON public.profiles 
AS PERMISSIVE
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- UPDATE policies (PERMISSIVE - at least one must pass)
CREATE POLICY "Users can update own profile" 
ON public.profiles 
AS PERMISSIVE
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "HR can update all profiles" 
ON public.profiles 
AS PERMISSIVE
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'hr_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr_manager'::app_role));

CREATE POLICY "Super Admin can update all profiles" 
ON public.profiles 
AS PERMISSIVE
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- INSERT policies (PERMISSIVE - at least one must pass)
CREATE POLICY "Super Admin can insert profiles" 
ON public.profiles 
AS PERMISSIVE
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- DELETE policies (PERMISSIVE - at least one must pass)
CREATE POLICY "Super Admin can delete profiles" 
ON public.profiles 
AS PERMISSIVE
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));