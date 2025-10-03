-- Add policy to allow users to update their own attendance (for clocking out)
CREATE POLICY "Users can update own attendance"
ON public.attendance
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);