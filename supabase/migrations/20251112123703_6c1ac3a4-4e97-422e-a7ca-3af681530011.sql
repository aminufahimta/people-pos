-- Add network_manager to attendance viewing policy
DROP POLICY IF EXISTS "HR and Super Admin can view all attendance" ON public.attendance;

CREATE POLICY "HR, Network Manager and Super Admin can view all attendance"
ON public.attendance
FOR SELECT
USING (
  has_role(auth.uid(), 'hr_manager'::app_role) OR 
  has_role(auth.uid(), 'network_manager'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);