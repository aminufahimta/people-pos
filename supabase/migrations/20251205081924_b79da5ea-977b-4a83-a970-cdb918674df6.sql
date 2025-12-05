-- Fix RLS policies on profiles table to explicitly require authentication

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "HR and Super Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Network Managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Project Managers can view employee profiles" ON public.profiles;
DROP POLICY IF EXISTS "Sales can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Task participants can view each other profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Recreate SELECT policies with explicit authentication checks
CREATE POLICY "HR and Super Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Network Managers can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'network_manager'::app_role));

CREATE POLICY "Project Managers can view employee profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'project_manager'::app_role) AND has_role(id, 'employee'::app_role));

CREATE POLICY "Sales can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Task participants can view each other profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM tasks
  WHERE ((tasks.assigned_to = auth.uid() AND tasks.created_by = profiles.id) 
      OR (tasks.created_by = auth.uid() AND tasks.assigned_to = profiles.id))
));

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);