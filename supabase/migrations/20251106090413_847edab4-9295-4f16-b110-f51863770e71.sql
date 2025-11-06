-- Drop the restrictive policy that only allows assigned employees to upload
DROP POLICY IF EXISTS "Assigned employees can upload attachments" ON public.task_attachments;

-- Create a new policy that allows both assigned employees AND task creators to upload
CREATE POLICY "Task participants can upload attachments"
ON public.task_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  (
    EXISTS (
      SELECT 1
      FROM tasks
      WHERE tasks.id = task_attachments.task_id
        AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
    )
  ) AND (auth.uid() = uploaded_by)
);