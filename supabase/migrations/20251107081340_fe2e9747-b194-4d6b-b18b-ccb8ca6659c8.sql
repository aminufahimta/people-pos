-- Update the notify_super_admins function to fetch settings from system_settings
CREATE OR REPLACE FUNCTION notify_super_admins(
  p_subject text,
  p_html text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
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

  -- Send email to each super admin
  FOR admin_record IN SELECT * FROM get_super_admin_emails()
  LOOP
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || supabase_key
      ),
      body := jsonb_build_object(
        'to', admin_record.email,
        'subject', p_subject,
        'html', p_html
      )
    );
  END LOOP;
END;
$$;