-- Allow Super Admin to upload attachments to any task
CREATE POLICY "Super Admin can upload attachments"
ON task_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) 
  AND auth.uid() = uploaded_by
);