-- Create projects table to group tasks by customer
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  project_status TEXT NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Project Manager can create projects
CREATE POLICY "Project Manager can create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'project_manager'::app_role)
  AND auth.uid() = created_by
);

-- Project Manager can view all projects
CREATE POLICY "Project Manager can view all projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'project_manager'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Project Manager can update projects
CREATE POLICY "Project Manager can update projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'project_manager'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Project Manager can delete projects
CREATE POLICY "Project Manager can delete projects"
ON public.projects
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'project_manager'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Super Admin can do everything with projects
CREATE POLICY "Super Admin can manage projects"
ON public.projects
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add project_id to tasks table
ALTER TABLE public.tasks ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);

-- Add trigger to update projects updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();