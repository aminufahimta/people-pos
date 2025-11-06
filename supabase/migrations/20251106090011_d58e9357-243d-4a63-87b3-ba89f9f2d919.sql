-- Allow task participants to view each other's profiles
-- This enables proper name display in task chats between employees and project managers

CREATE POLICY "Task participants can view each other profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE (tasks.assigned_to = auth.uid() AND tasks.created_by = profiles.id)
       OR (tasks.created_by = auth.uid() AND tasks.assigned_to = profiles.id)
  )
);
