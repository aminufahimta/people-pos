-- Allow Network Managers to view all tasks
CREATE POLICY "Network Managers can view all tasks"
ON tasks
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'network_manager'::app_role));

-- Allow Network Managers to update task status and add comments
CREATE POLICY "Network Managers can update tasks"
ON tasks
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'network_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'network_manager'::app_role));

-- Allow Network Managers to send messages on tasks
CREATE POLICY "Network Managers can send messages"
ON task_messages
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'network_manager'::app_role) 
  AND auth.uid() = sender_id
);

-- Allow Network Managers to view all task messages
CREATE POLICY "Network Managers can view all messages"
ON task_messages
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'network_manager'::app_role));

-- Allow Network Managers to view all task attachments
CREATE POLICY "Network Managers can view all attachments"
ON task_attachments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'network_manager'::app_role));

-- Allow Network Managers to view all profiles
CREATE POLICY "Network Managers can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'network_manager'::app_role));