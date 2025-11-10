-- Drop the conflicting policy
DROP POLICY IF EXISTS "Document viewers can see document uploader profiles" ON public.profiles;