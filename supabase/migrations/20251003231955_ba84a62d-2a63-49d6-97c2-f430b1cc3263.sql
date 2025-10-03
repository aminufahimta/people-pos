DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'HR can update all profiles'
  ) THEN
    CREATE POLICY "HR can update all profiles"
    ON public.profiles
    FOR UPDATE
    USING (has_role(auth.uid(), 'hr_manager'::app_role));
  END IF;
END;
$$;