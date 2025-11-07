-- Drop policy if it exists, then create it
DROP POLICY IF EXISTS "Task creators can update their tasks" ON public.tasks;

CREATE POLICY "Task creators can update their tasks"
ON public.tasks
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);