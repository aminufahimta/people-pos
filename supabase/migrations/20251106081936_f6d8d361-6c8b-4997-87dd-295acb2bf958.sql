-- Allow project managers to view profiles of employees (technicians) only
-- This enables assignment of tasks to technicians while excluding HR managers and Super Admins

-- Create SELECT policy on public.profiles for project managers
CREATE POLICY "Project Managers can view employee profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'project_manager'::app_role)
  AND has_role(id, 'employee'::app_role)
);
