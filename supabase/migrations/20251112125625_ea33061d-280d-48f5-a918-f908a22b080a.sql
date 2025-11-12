-- Allow Network Managers to view all projects
CREATE POLICY "Network Managers can view all projects"
ON public.projects
FOR SELECT
USING (has_role(auth.uid(), 'network_manager'::app_role));