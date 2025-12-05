-- Fix RLS policies on salary_info table to explicitly require authentication

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "HR and Super Admin can view all salaries" ON public.salary_info;
DROP POLICY IF EXISTS "Network Managers can view all salaries" ON public.salary_info;
DROP POLICY IF EXISTS "Users can view own salary" ON public.salary_info;
DROP POLICY IF EXISTS "HR can update salary info" ON public.salary_info;
DROP POLICY IF EXISTS "Super Admin can manage salary info" ON public.salary_info;

-- Recreate policies with explicit authentication checks
CREATE POLICY "HR and Super Admin can view all salaries" 
ON public.salary_info 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Network Managers can view all salaries" 
ON public.salary_info 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'network_manager'::app_role));

CREATE POLICY "Users can view own salary" 
ON public.salary_info 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "HR can update salary info" 
ON public.salary_info 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'hr_manager'::app_role));

CREATE POLICY "Super Admin can manage salary info" 
ON public.salary_info 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));