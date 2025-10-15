-- Remove the public read policy that exposes system settings to everyone
DROP POLICY IF EXISTS "Settings are viewable by everyone" ON public.system_settings;

-- Add restricted policies for authenticated users only
CREATE POLICY "Authenticated users can view settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (true);

-- Ensure super admin can still manage all settings
-- (The "Super Admin can manage settings" policy already exists, so we don't need to recreate it)