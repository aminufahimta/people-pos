-- Fix employee_audits RLS policy to prevent employees from modifying records after submission
-- The table already has a 'status' field with values like 'draft' and 'submitted'

-- Drop the existing employee update policy
DROP POLICY IF EXISTS "Employees can update own audits" ON public.employee_audits;

-- Recreate with restriction: employees can only update their own audits when status is 'draft'
CREATE POLICY "Employees can update own draft audits" 
ON public.employee_audits 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id AND status = 'draft')
WITH CHECK (auth.uid() = user_id AND status = 'draft');

-- Also update the SELECT policy to require authentication
DROP POLICY IF EXISTS "Employees can view own audits" ON public.employee_audits;
CREATE POLICY "Employees can view own audits" 
ON public.employee_audits 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Update the INSERT policy to require authentication and only allow draft status
DROP POLICY IF EXISTS "Employees can insert own audits" ON public.employee_audits;
CREATE POLICY "Employees can insert own audits" 
ON public.employee_audits 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'draft');

-- Update HR and Super Admin policies to require authentication
DROP POLICY IF EXISTS "HR and Super Admin can view all audits" ON public.employee_audits;
CREATE POLICY "HR and Super Admin can view all audits" 
ON public.employee_audits 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "HR and Super Admin can update all audits" ON public.employee_audits;
CREATE POLICY "HR and Super Admin can update all audits" 
ON public.employee_audits 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Super Admin can delete audits" ON public.employee_audits;
CREATE POLICY "Super Admin can delete audits" 
ON public.employee_audits 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));