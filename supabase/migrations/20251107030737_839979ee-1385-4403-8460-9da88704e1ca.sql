-- Fix project manager task update policy by adding WITH CHECK clause
DROP POLICY IF EXISTS "Project Manager can update tasks" ON public.tasks;

CREATE POLICY "Project Manager can update tasks"
ON public.tasks
FOR UPDATE
USING (
  has_role(auth.uid(), 'project_manager'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'project_manager'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);