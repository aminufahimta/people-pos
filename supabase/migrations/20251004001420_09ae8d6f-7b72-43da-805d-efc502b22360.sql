-- Allow public read access to non-sensitive system settings
-- Enable SELECT for everyone (authenticated or not) so the landing and login pages can render dynamic text
CREATE POLICY "Settings are viewable by everyone"
ON public.system_settings
FOR SELECT
USING (true);
