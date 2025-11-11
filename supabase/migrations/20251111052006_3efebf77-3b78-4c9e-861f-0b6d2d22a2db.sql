-- Add soft delete columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Drop existing project manager policies for tasks
DROP POLICY IF EXISTS "Project Manager can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project Manager can update tasks" ON public.tasks;

-- Project managers can only hard delete tasks within 1 hour of creation
CREATE POLICY "Project Manager can delete tasks within 1 hour"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'project_manager'::app_role) 
  AND created_by = auth.uid()
  AND created_at > NOW() - INTERVAL '1 hour'
  AND is_deleted = FALSE
);

-- Project managers can only soft delete tasks (mark as deleted)
CREATE POLICY "Project Manager can soft delete tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'project_manager'::app_role)
  AND is_deleted = FALSE
)
WITH CHECK (
  has_role(auth.uid(), 'project_manager'::app_role)
  AND is_deleted = TRUE
  AND deleted_by = auth.uid()
  AND deleted_at IS NOT NULL
);

-- Super admin can permanently delete tasks
CREATE POLICY "Super Admin can permanently delete tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Super admin can restore or manage deleted tasks
CREATE POLICY "Super Admin can manage deleted tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Project managers can view non-deleted tasks and their own deleted tasks
CREATE POLICY "Project Manager can view active and own deleted tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'project_manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  AND (is_deleted = FALSE OR deleted_by = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))
);