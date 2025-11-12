-- Grant Network Managers permission to view all salary information
CREATE POLICY "Network Managers can view all salaries"
ON public.salary_info
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'network_manager'::app_role));