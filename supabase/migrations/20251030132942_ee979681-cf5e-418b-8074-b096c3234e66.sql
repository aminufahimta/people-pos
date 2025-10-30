-- Add inventory tracking columns to tasks table
ALTER TABLE public.tasks ADD COLUMN routers_used integer DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN poe_adapters_used integer DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN poles_used integer DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN anchors_used integer DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN inventory_deducted boolean DEFAULT false;

-- Update RLS policies to allow super_admin full access to tasks
CREATE POLICY "Super Admin can view all tasks"
ON public.tasks
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super Admin can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Super Admin can update all tasks"
ON public.tasks
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super Admin can delete tasks"
ON public.tasks
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));