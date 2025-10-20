-- Drop the insecure policy
DROP POLICY IF EXISTS "Unapproved users can only view own profile" ON public.profiles;

-- Create corrected policy that strictly limits unapproved users to their own profile only
CREATE POLICY "Unapproved users can only view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);