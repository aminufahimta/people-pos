-- Drop the policy that allows all authenticated users to view settings
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.system_settings;

-- Create a new policy that only allows super admins to view settings
CREATE POLICY "Super Admin can view settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));