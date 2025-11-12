-- Remove link from task message notifications
CREATE OR REPLACE FUNCTION public.notify_task_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  task_record record;
  sender_name text;
  sender_email text;
  assignee_name text;
  assignee_email text;
  creator_name text;
  creator_email text;
  message_html text;
  admin_record record;
  recipients text[] := '{}';
  subj text;
  html_prefix text;
BEGIN
  -- Get task details
  SELECT * INTO task_record FROM tasks WHERE id = NEW.task_id;
  
  -- Get sender details
  SELECT full_name, email INTO sender_name, sender_email FROM profiles WHERE id = NEW.sender_id;
  
  -- Get assignee details
  SELECT full_name, email INTO assignee_name, assignee_email 
  FROM profiles WHERE id = task_record.assigned_to;
  
  -- Get creator details
  SELECT full_name, email INTO creator_name, creator_email 
  FROM profiles WHERE id = task_record.created_by;
  
  -- Build message HTML with prominent task info (no link)
  message_html := '
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-bottom: 20px; border-bottom: 3px solid #8b5cf6; padding-bottom: 10px;">
          💬 New Comment on Task
        </h2>
        <div style="background-color: #8b5cf6; padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: white;">' || task_record.title || '</p>
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
    </div>
  ';
  
  subj := '💬 New comment on: ' || task_record.title;
  html_prefix := '<h2 style="color: #8b5cf6;">New Comment on Task</h2>' ||
                 '<p style="color: #6b7280; font-size: 16px;">Hi there,</p>' ||
                 '<p style="color: #6b7280; font-size: 16px;">' || COALESCE(sender_name, 'Someone') || ' left a comment on a task:</p>';
  
  -- Collect unique recipients (exclude sender)
  IF assignee_email IS NOT NULL AND NEW.sender_id != task_record.assigned_to THEN
    IF NOT assignee_email = ANY(recipients) THEN
      recipients := array_append(recipients, assignee_email);
    END IF;
  END IF;
  
  IF creator_email IS NOT NULL AND NEW.sender_id != task_record.created_by THEN
    IF NOT creator_email = ANY(recipients) THEN
      recipients := array_append(recipients, creator_email);
    END IF;
  END IF;
  
  FOR admin_record IN SELECT * FROM get_super_admin_emails() LOOP
    IF admin_record.email IS NOT NULL AND admin_record.email != sender_email THEN
      IF NOT admin_record.email = ANY(recipients) THEN
        recipients := array_append(recipients, admin_record.email);
      END IF;
    END IF;
  END LOOP;
  
  -- If no recipients, exit
  IF array_length(recipients, 1) IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Send to each unique recipient once
  FOR admin_record IN SELECT unnest(recipients) AS email LOOP
    PERFORM send_email_to_user(
      admin_record.email,
      subj,
      html_prefix || message_html
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;