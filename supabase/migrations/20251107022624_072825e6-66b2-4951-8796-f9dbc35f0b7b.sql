-- Drop the old policy
DROP POLICY IF EXISTS "Task participants can send messages" ON public.task_messages;

-- Create new policy that includes project managers
CREATE POLICY "Task participants and project managers can send messages"
ON public.task_messages
FOR INSERT
TO authenticated
WITH CHECK (
  (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_messages.task_id
      AND (
        tasks.assigned_to = auth.uid() 
        OR tasks.created_by = auth.uid()
      )
    )
    OR has_role(auth.uid(), 'project_manager'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  AND auth.uid() = sender_id
);