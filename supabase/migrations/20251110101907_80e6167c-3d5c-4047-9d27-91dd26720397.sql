-- Allow users who can view employee documents to also view the associated profiles
CREATE POLICY "Document viewers can see document uploader profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.employee_documents
    WHERE employee_documents.user_id = profiles.id
  )
  AND (
    has_role(auth.uid(), 'hr_manager'::app_role) 
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);