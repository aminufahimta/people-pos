-- Create trigger for task message notifications
CREATE TRIGGER on_task_message_created
  AFTER INSERT ON public.task_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_message();

-- Update notify_task_message to also notify super admins and project managers
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

-- Create function to notify task review
CREATE OR REPLACE FUNCTION public.notify_task_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  assignee_name text;
  creator_name text;
  creator_email text;
  project_name text;
  task_html text;
  admin_record record;
BEGIN
  -- Only trigger when task moves to under_review
  IF NEW.status = 'under_review' AND OLD.status != 'under_review' THEN
    -- Get assignee name
    SELECT full_name INTO assignee_name FROM profiles WHERE id = NEW.assigned_to;
    
    -- Get creator details
    SELECT full_name, email INTO creator_name, creator_email 
    FROM profiles WHERE id = NEW.created_by;
    
    -- Get project name if available
    IF NEW.project_id IS NOT NULL THEN
      SELECT customer_name INTO project_name
      FROM projects WHERE id = NEW.project_id;
    END IF;
    
    -- Build task details HTML
    task_html := '
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-bottom: 20px; border-bottom: 3px solid #f59e0b; padding-bottom: 10px;">
            Task Pending Review
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Task Title:</td>
              <td style="padding: 12px 0; color: #1f2937;">' || NEW.title || '</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Completed By:</td>
              <td style="padding: 12px 0; color: #1f2937;">' || COALESCE(assignee_name, 'Unknown') || '</td>
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
          </table>
        </div>
        <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Action Required:</strong> Please review and approve or reject this completed task.
          </p>
        </div>
      </div>
    ';
    
    -- Email the project manager who created the task
    IF creator_email IS NOT NULL THEN
      PERFORM send_email_to_user(
        creator_email,
        '⏳ Task Pending Review: ' || NEW.title,
        '<h2 style="color: #f59e0b;">Task Awaiting Your Review</h2>' ||
        '<p style="color: #6b7280; font-size: 16px;">Hi ' || COALESCE(creator_name, 'there') || ',</p>' ||
        '<p style="color: #6b7280; font-size: 16px;">' || COALESCE(assignee_name, 'A technician') || ' has marked this task as completed and it requires your review:</p>' ||
        task_html
      );
    END IF;
    
    -- Notify super admins
    FOR admin_record IN SELECT * FROM get_super_admin_emails()
    LOOP
      PERFORM send_email_to_user(
        admin_record.email,
        '⏳ Task Pending Review: ' || NEW.title,
        '<h2 style="color: #f59e0b;">Task Awaiting Review</h2>' ||
        '<p style="color: #6b7280; font-size: 16px;">Hi ' || admin_record.full_name || ',</p>' ||
        '<p style="color: #6b7280; font-size: 16px;">A task has been marked as completed and requires review:</p>' ||
        task_html
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for task review notifications
CREATE TRIGGER on_task_status_review
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_review();