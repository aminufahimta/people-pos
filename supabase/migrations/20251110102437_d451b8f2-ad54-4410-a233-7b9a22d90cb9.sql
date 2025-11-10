-- Drop the problematic recursive policy on tasks
DROP POLICY IF EXISTS "Technicians can view all tasks in their projects" ON public.tasks;

-- Create a simpler, non-recursive policy for technicians to view tasks in their projects
-- This policy allows technicians to see tasks where they are assigned in any project they're part of
CREATE POLICY "Technicians can view tasks in assigned projects"
ON public.tasks
FOR SELECT
USING (
  auth.uid() = assigned_to
  OR 
  EXISTS (
    SELECT 1 FROM tasks t2
    WHERE t2.project_id = tasks.project_id
    AND t2.assigned_to = auth.uid()
    AND tasks.project_id IS NOT NULL
    LIMIT 1
  )
);

-- Wait, that still has recursion. Let me use a better approach with a helper function
DROP POLICY IF EXISTS "Technicians can view tasks in assigned projects" ON public.tasks;

-- Create a security definer function to get user's project IDs
CREATE OR REPLACE FUNCTION public.get_user_project_ids(_user_id uuid)
RETURNS TABLE(project_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT t.project_id
  FROM tasks t
  WHERE t.assigned_to = _user_id
  AND t.project_id IS NOT NULL
$$;

-- Now create the policy using the function
CREATE POLICY "Technicians can view tasks in assigned projects"
ON public.tasks
FOR SELECT
USING (
  auth.uid() = assigned_to
  OR
  (project_id IS NOT NULL AND project_id IN (SELECT get_user_project_ids(auth.uid())))
);