-- Create growth_tasks table
CREATE TABLE public.growth_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create growth_task_completions table
CREATE TABLE public.growth_task_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.growth_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Enable RLS
ALTER TABLE public.growth_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_task_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for growth_tasks
CREATE POLICY "Super Admin can manage growth tasks"
ON public.growth_tasks
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view active tasks for their role"
ON public.growth_tasks
FOR SELECT
USING (
  is_active = true 
  AND (
    (has_role(auth.uid(), 'sales'::app_role) AND 'sales' = ANY(target_roles))
    OR (has_role(auth.uid(), 'network_manager'::app_role) AND 'network_manager' = ANY(target_roles))
    OR (has_role(auth.uid(), 'project_manager'::app_role) AND 'project_manager' = ANY(target_roles))
  )
);

-- RLS Policies for growth_task_completions
CREATE POLICY "Users can insert own completions"
ON public.growth_task_completions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own completions"
ON public.growth_task_completions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Super Admin can view all completions"
ON public.growth_task_completions
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super Admin can delete completions"
ON public.growth_task_completions
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_growth_tasks_updated_at
BEFORE UPDATE ON public.growth_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_growth_tasks_target_roles ON public.growth_tasks USING GIN(target_roles);
CREATE INDEX idx_growth_task_completions_user_task ON public.growth_task_completions(user_id, task_id);
CREATE INDEX idx_growth_task_completions_completed_at ON public.growth_task_completions(completed_at);