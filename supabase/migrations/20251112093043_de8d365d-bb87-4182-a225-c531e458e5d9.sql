-- Update notify_task_message function to include a direct link to the task
CREATE OR REPLACE FUNCTION public.notify_task_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  task_record record;
  sender_name text;
  sender_role app_role;
  assignee_name text;
  assignee_email text;
  creator_name text;
  creator_email text;
  message_html text;
  admin_record record;
  app_url text;
BEGIN
  -- Get task details
  SELECT * INTO task_record FROM tasks WHERE id = NEW.task_id;
  
  -- Get sender name and role
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  SELECT role INTO sender_role FROM user_roles WHERE user_id = NEW.sender_id LIMIT 1;
  
  -- Get assignee details
  SELECT full_name, email INTO assignee_name, assignee_email 
  FROM profiles WHERE id = task_record.assigned_to;
  
  -- Get creator details
  SELECT full_name, email INTO creator_name, creator_email 
  FROM profiles WHERE id = task_record.created_by;
  
  -- Get application URL from system settings (fallback to supabase URL domain)
  SELECT setting_value INTO app_url
  FROM system_settings
  WHERE setting_key = 'supabase_url';
  
  -- Extract domain and construct app URL (remove /rest/v1 and API subdomain)
  app_url := regexp_replace(app_url, 'https://[^.]+\.supabase\.co.*', 'https://lovable.app/projects/');
  
  -- Build message HTML with prominent task info and link
  message_html := '
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-bottom: 20px; border-bottom: 3px solid #8b5cf6; padding-bottom: 10px;">
          💬 New Comment on Task
        </h2>
        <div style="background-color: #8b5cf6; padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: white; margin-bottom: 15px;">' || task_record.title || '</p>
          <a href="' || app_url || '/dashboard" style="display: inline-block; background-color: white; color: #8b5cf6; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            View Task & Reply
          </a>
        </div>
        <div style="margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280; margin-bottom: 5px;"><strong>From:</strong></p>
          <p style="margin: 0; font-size: 16px; color: #1f2937;">' || COALESCE(sender_name, 'Unknown') || '</p>
        </div>
        <div style="background-color: #faf5ff; padding: 20px; border-left: 4px solid #8b5cf6; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280; margin-bottom: 5px;"><strong>Message:</strong></p>
          <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6;">' || NEW.message || '</p>
        </div>
      </div>
      <div style="margin-top: 20px; padding: 15px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">
          <strong>Tip:</strong> Click the button above to view the full task and reply to this message.
        </p>
      </div>
    </div>
  ';
  
  -- Email the assignee if they're not the sender
  IF assignee_email IS NOT NULL AND NEW.sender_id != task_record.assigned_to THEN
    PERFORM send_email_to_user(
      assignee_email,
      '💬 New comment on: ' || task_record.title,
      '<h2 style="color: #8b5cf6;">New Comment on Your Task</h2>' ||
      '<p style="color: #6b7280; font-size: 16px;">Hi ' || COALESCE(assignee_name, 'there') || ',</p>' ||
      '<p style="color: #6b7280; font-size: 16px;">' || COALESCE(sender_name, 'Someone') || ' left a comment on your task:</p>' ||
      message_html
    );
  END IF;
  
  -- Email the creator if they're not the sender
  IF creator_email IS NOT NULL AND NEW.sender_id != task_record.created_by THEN
    PERFORM send_email_to_user(
      creator_email,
      '💬 New comment on: ' || task_record.title,
      '<h2 style="color: #8b5cf6;">New Comment on Task</h2>' ||
      '<p style="color: #6b7280; font-size: 16px;">Hi ' || COALESCE(creator_name, 'there') || ',</p>' ||
      '<p style="color: #6b7280; font-size: 16px;">' || COALESCE(sender_name, 'Someone') || ' left a comment on the task you created:</p>' ||
      message_html
    );
  END IF;
  
  -- Email super admins (unless they're the sender)
  FOR admin_record IN SELECT * FROM get_super_admin_emails()
  LOOP
    IF admin_record.email != (SELECT email FROM profiles WHERE id = NEW.sender_id) THEN
      PERFORM send_email_to_user(
        admin_record.email,
        '💬 New comment on: ' || task_record.title,
        '<h2 style="color: #8b5cf6;">New Comment on Task</h2>' ||
        '<p style="color: #6b7280; font-size: 16px;">Hi ' || admin_record.full_name || ',</p>' ||
        '<p style="color: #6b7280; font-size: 16px;">' || COALESCE(sender_name, 'Someone') || ' left a comment on a task:</p>' ||
        message_html
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;