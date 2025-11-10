-- Allow technicians to view projects for tasks they're assigned to
CREATE POLICY "Technicians can view projects for their assigned tasks"
ON public.projects
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.project_id = projects.id
    AND tasks.assigned_to = auth.uid()
  )
);