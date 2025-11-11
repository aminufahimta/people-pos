-- Drop existing triggers
DROP TRIGGER IF EXISTS notify_task_assignment_trigger ON tasks;
DROP TRIGGER IF EXISTS notify_task_messages_trigger ON task_messages;

-- Helper function to send email to a single user
CREATE OR REPLACE FUNCTION public.send_email_to_user(
  p_email text,
  p_subject text,
  p_html text
)
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

  -- Send email
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_key
    ),
    body := jsonb_build_object(
      'to', p_email,
      'subject', p_subject,
      'html', p_html
    )
  );
END;
$function$;

-- Enhanced task assignment notification function
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  assignee_name text;
  assignee_email text;
  creator_name text;
  creator_email text;
  task_html text;
  project_name text;
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    -- Get assignee details
    SELECT full_name, email INTO assignee_name, assignee_email 
    FROM profiles WHERE id = NEW.assigned_to;
    
    -- Get creator details
    SELECT full_name, email INTO creator_name, creator_email 
    FROM profiles WHERE id = NEW.created_by;
    
    -- Get project name if available
    IF NEW.project_id IS NOT NULL THEN
      SELECT customer_name INTO project_name
      FROM projects WHERE id = NEW.project_id;
    END IF;
    
    -- Build professional task details HTML
    task_html := '
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-bottom: 20px; border-bottom: 3px solid #3b82f6; padding-bottom: 10px;">
            Task Details
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Task Title:</td>
              <td style="padding: 12px 0; color: #1f2937;">' || NEW.title || '</td>
            </tr>
            ' || CASE WHEN project_name IS NOT NULL THEN
            '<tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Project:</td>
              <td style="padding: 12px 0; color: #1f2937;">' || project_name || '</td>
            </tr>' ELSE '' END || '
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Priority:</td>
              <td style="padding: 12px 0;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; 
                  background-color: ' || 
                  CASE NEW.priority 
                    WHEN 'urgent' THEN '#fee2e2; color: #991b1b;'
                    WHEN 'high' THEN '#fed7aa; color: #9a3412;'
                    WHEN 'medium' THEN '#fef3c7; color: #92400e;'
                    ELSE '#dbeafe; color: #1e40af;'
                  END || '">' || UPPER(NEW.priority) || '</span>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Due Date:</td>
              <td style="padding: 12px 0; color: #1f2937;">' || COALESCE(to_char(NEW.due_date, 'MMMM DD, YYYY'), 'Not set') || '</td>
            </tr>
            ' || CASE WHEN NEW.description IS NOT NULL THEN
            '<tr>
              <td style="padding: 12px 0; font-weight: bold; color: #6b7280; vertical-align: top;">Description:</td>
              <td style="padding: 12px 0; color: #1f2937;">' || NEW.description || '</td>
            </tr>' ELSE '' END || '
          </table>
        </div>
        <div style="margin-top: 20px; padding: 15px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            <strong>Note:</strong> Please review this task and update its status as you make progress.
          </p>
        </div>
      </div>
    ';
    
    -- Email the assigned technician
    IF assignee_email IS NOT NULL THEN
      PERFORM send_email_to_user(
        assignee_email,
        '🎯 New Task Assigned: ' || NEW.title,
        '<h2 style="color: #3b82f6;">You have been assigned a new task!</h2>' ||
        '<p style="color: #6b7280; font-size: 16px;">Hi ' || COALESCE(assignee_name, 'there') || ',</p>' ||
        '<p style="color: #6b7280; font-size: 16px;">' || COALESCE(creator_name, 'Your manager') || ' has assigned you a new task. Please review the details below:</p>' ||
        task_html
      );
    END IF;
    
    -- Email the project manager who created the task
    IF creator_email IS NOT NULL THEN
      PERFORM send_email_to_user(
        creator_email,
        '✅ Task Created: ' || NEW.title,
        '<h2 style="color: #10b981;">Task Created Successfully!</h2>' ||
        '<p style="color: #6b7280; font-size: 16px;">Hi ' || COALESCE(creator_name, 'there') || ',</p>' ||
        '<p style="color: #6b7280; font-size: 16px;">Your task has been created and assigned to ' || COALESCE(assignee_name, 'a team member') || '. Here are the details:</p>' ||
        task_html
      );
    END IF;
    
    -- Also notify super admins
    PERFORM notify_super_admins(
      'Task Assigned - ' || NEW.title,
      '<h2>New Task Assignment</h2>' ||
      '<p><strong>Task:</strong> ' || NEW.title || '</p>' ||
      '<p><strong>Assigned To:</strong> ' || COALESCE(assignee_name, 'Unknown') || '</p>' ||
      '<p><strong>Created By:</strong> ' || COALESCE(creator_name, 'Unknown') || '</p>' ||
      '<p><strong>Priority:</strong> ' || NEW.priority || '</p>' ||
      '<p><strong>Due Date:</strong> ' || COALESCE(to_char(NEW.due_date, 'YYYY-MM-DD'), 'Not set') || '</p>'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- New function to notify on task messages
CREATE OR REPLACE FUNCTION public.notify_task_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  task_record record;
  sender_name text;
  assignee_name text;
  assignee_email text;
  creator_name text;
  creator_email text;
  message_html text;
BEGIN
  -- Get task details
  SELECT * INTO task_record FROM tasks WHERE id = NEW.task_id;
  
  -- Get sender name
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  
  -- Get assignee details
  SELECT full_name, email INTO assignee_name, assignee_email 
  FROM profiles WHERE id = task_record.assigned_to;
  
  -- Get creator details
  SELECT full_name, email INTO creator_name, creator_email 
  FROM profiles WHERE id = task_record.created_by;
  
  -- Build message HTML
  message_html := '
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-bottom: 20px; border-bottom: 3px solid #8b5cf6; padding-bottom: 10px;">
          💬 New Comment on Task
        </h2>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280; margin-bottom: 5px;"><strong>Task:</strong></p>
          <p style="margin: 0; font-size: 16px; color: #1f2937;">' || task_record.title || '</p>
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
          <strong>Tip:</strong> Reply to this message in the system to continue the conversation.
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
  
  RETURN NEW;
END;
$function$;

-- Create triggers
CREATE TRIGGER notify_task_assignment_trigger
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_assignment();

CREATE TRIGGER notify_task_messages_trigger
AFTER INSERT ON task_messages
FOR EACH ROW
EXECUTE FUNCTION notify_task_message();