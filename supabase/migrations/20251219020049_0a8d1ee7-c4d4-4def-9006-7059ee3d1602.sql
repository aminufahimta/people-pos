-- Update send_email_to_user function to pass trigger context
CREATE OR REPLACE FUNCTION public.send_email_to_user(p_email text, p_subject text, p_html text, p_triggered_by text DEFAULT 'database_trigger', p_recipient_name text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  email_enabled text;
  supabase_url text;
  supabase_key text;
BEGIN
  -- Check if email notifications are enabled
  SELECT setting_value INTO email_enabled
  FROM system_settings
  WHERE setting_key = 'email_notifications_enabled';
  
  IF email_enabled != 'true' THEN
    RETURN;
  END IF;

  -- Get Supabase configuration
  SELECT setting_value INTO supabase_url
  FROM system_settings
  WHERE setting_key = 'supabase_url';
  
  SELECT setting_value INTO supabase_key
  FROM system_settings
  WHERE setting_key = 'supabase_anon_key';

  -- Send email with tracking info
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_key
    ),
    body := jsonb_build_object(
      'to', p_email,
      'subject', p_subject,
      'html', p_html,
      'triggered_by', p_triggered_by,
      'recipient_name', p_recipient_name
    )
  );
END;
$function$;