-- Create RLS policy for sales to view all tasks
CREATE POLICY "Sales can view all tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role));

-- Create RLS policy for sales to update tasks (but not delete)
CREATE POLICY "Sales can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role))
WITH CHECK (has_role(auth.uid(), 'sales'::app_role));

-- Allow sales to view profiles (to see employee/customer info)
CREATE POLICY "Sales can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role));

-- Allow sales to view projects
CREATE POLICY "Sales can view all projects"
ON public.projects
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role));

-- Allow sales to view task messages
CREATE POLICY "Sales can view task messages"
ON public.task_messages
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role));

-- Allow sales to send task messages
CREATE POLICY "Sales can send task messages"
ON public.task_messages
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'sales'::app_role) AND auth.uid() = sender_id);

-- Allow sales to view task attachments
CREATE POLICY "Sales can view task attachments"
ON public.task_attachments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role));