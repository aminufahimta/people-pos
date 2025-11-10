-- Allow technicians to view all tasks in projects where they have assigned tasks
CREATE POLICY "Technicians can view all tasks in their projects"
ON public.tasks
FOR SELECT
USING (
  project_id IN (
    SELECT DISTINCT project_id
    FROM tasks
    WHERE assigned_to = auth.uid()
    AND project_id IS NOT NULL
  )
);