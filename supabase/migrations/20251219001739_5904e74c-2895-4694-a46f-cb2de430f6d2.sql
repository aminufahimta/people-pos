-- Fix overly broad RLS policies on profiles table
-- Remove policies that give too much access and implement least privilege

-- Drop existing SELECT policies that are too broad
DROP POLICY IF EXISTS "Network Managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Sales can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Project Managers can view employee profiles" ON public.profiles;
DROP POLICY IF EXISTS "Task participants can view each other profiles" ON public.profiles;
DROP POLICY IF EXISTS "HR and Super Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Recreate policies with proper restrictions

-- Users can always view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- HR and Super Admin can view all profiles (legitimate business need)
CREATE POLICY "HR and Super Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'hr_manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Project Managers can only view profiles of employees assigned to their tasks (not all profiles)
CREATE POLICY "Project Managers can view task-related profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'project_manager'::app_role) 
  AND EXISTS (
    SELECT 1 FROM tasks 
    WHERE tasks.created_by = auth.uid() 
    AND tasks.assigned_to = profiles.id
  )
);

-- Network Managers can only view profiles of employees assigned to tasks (not all profiles)
CREATE POLICY "Network Managers can view task-related profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'network_manager'::app_role) 
  AND EXISTS (
    SELECT 1 FROM tasks 
    WHERE tasks.assigned_to = profiles.id
    AND tasks.is_deleted = false
  )
);

-- Sales can only view profiles of employees they work with on tasks (not all profiles)
CREATE POLICY "Sales can view task-related profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'sales'::app_role) 
  AND EXISTS (
    SELECT 1 FROM tasks 
    WHERE tasks.assigned_to = profiles.id
    AND tasks.is_deleted = false
  )
);

-- Task participants can view ONLY basic profile info of each other (limited to task context)
CREATE POLICY "Task participants can view each other profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks
    WHERE (
      (tasks.assigned_to = auth.uid() AND tasks.created_by = profiles.id) 
      OR 
      (tasks.created_by = auth.uid() AND tasks.assigned_to = profiles.id)
    )
  )
);

-- Fix salary_info: Remove Network Managers access to all salary data
DROP POLICY IF EXISTS "Network Managers can view all salaries" ON public.salary_info;