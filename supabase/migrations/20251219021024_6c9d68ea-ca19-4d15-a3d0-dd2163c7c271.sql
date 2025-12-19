-- Drop the old 3-parameter version of send_email_to_user to resolve ambiguity
DROP FUNCTION IF EXISTS public.send_email_to_user(text, text, text);