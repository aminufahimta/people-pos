-- Create inventory_items table
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('Router', 'POE Adapter', 'Pole', 'Anchor', 'Other')),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  last_restocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  installation_address TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on inventory_items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_items (Super Admin only)
CREATE POLICY "Super Admin can view all inventory" 
ON public.inventory_items 
AS PERMISSIVE
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super Admin can insert inventory" 
ON public.inventory_items 
AS PERMISSIVE
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super Admin can update inventory" 
ON public.inventory_items 
AS PERMISSIVE
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super Admin can delete inventory" 
ON public.inventory_items 
AS PERMISSIVE
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for tasks
CREATE POLICY "Project Manager can view all tasks" 
ON public.tasks 
AS PERMISSIVE
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'project_manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Technicians can view assigned tasks" 
ON public.tasks 
AS PERMISSIVE
FOR SELECT 
TO authenticated
USING (auth.uid() = assigned_to);

CREATE POLICY "Project Manager can create tasks" 
ON public.tasks 
AS PERMISSIVE
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'project_manager'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Project Manager can update tasks" 
ON public.tasks 
AS PERMISSIVE
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'project_manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Project Manager can delete tasks" 
ON public.tasks 
AS PERMISSIVE
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'project_manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Technicians can update assigned tasks status" 
ON public.tasks 
AS PERMISSIVE
FOR UPDATE 
TO authenticated
USING (auth.uid() = assigned_to)
WITH CHECK (auth.uid() = assigned_to);

-- Create trigger for updated_at on inventory_items
CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on tasks
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();