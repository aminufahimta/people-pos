-- Create security definer function to check if user can upload attachments for a task
CREATE OR REPLACE FUNCTION public.can_upload_task_attachment(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE id = _task_id
      AND (assigned_to = _user_id OR created_by = _user_id)
  )
$$;

-- Drop the existing policy
DROP POLICY IF EXISTS "Task participants can upload attachments" ON task_attachments;

-- Create new policy using the security definer function
CREATE POLICY "Task participants can upload attachments"
ON task_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_upload_task_attachment(auth.uid(), task_id) 
  AND auth.uid() = uploaded_by
);