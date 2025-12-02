-- Fix RLS policy for task_messages to use authenticated role
DROP POLICY IF EXISTS "Users can view messages for their tasks" ON public.task_messages;

CREATE POLICY "Users can view messages for their tasks" 
ON public.task_messages 
FOR SELECT
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_messages.task_id 
    AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
  ))
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'project_manager'::app_role)
  OR has_role(auth.uid(), 'hr_manager'::app_role)
);