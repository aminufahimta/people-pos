-- First, let's create helper functions to get network managers and sales emails
CREATE OR REPLACE FUNCTION public.get_network_manager_emails()
RETURNS TABLE(email text, full_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.email, p.full_name
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'network_manager'::app_role
  AND p.email IS NOT NULL
  AND p.is_approved = true
$$;

CREATE OR REPLACE FUNCTION public.get_sales_emails()
RETURNS TABLE(email text, full_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.email, p.full_name
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'sales'::app_role
  AND p.email IS NOT NULL
  AND p.is_approved = true
$$;

-- Now update the notify_task_message function to fix duplicates and add new recipients
CREATE OR REPLACE FUNCTION public.notify_task_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_record record;
  sender_name text;
  sender_email text;
  assignee_email text;
  creator_email text;
  project_name text;
  message_html text;
  recipient_record record;
  recipients text[] := '{}';
  subj text;
  html_prefix text;
BEGIN
  -- Get task details
  SELECT * INTO task_record FROM tasks WHERE id = NEW.task_id;
  
  -- Get sender details
  SELECT full_name, email INTO sender_name, sender_email FROM profiles WHERE id = NEW.sender_id;
  
  -- Get assignee email
  SELECT email INTO assignee_email FROM profiles WHERE id = task_record.assigned_to;
  
  -- Get creator email
  SELECT email INTO creator_email FROM profiles WHERE id = task_record.created_by;
  
  -- Get project name if available
  IF task_record.project_id IS NOT NULL THEN
    SELECT customer_name INTO project_name
    FROM projects WHERE id = task_record.project_id;
  END IF;
  
  -- Build message HTML with project and task info
  message_html := '
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-bottom: 20px; border-bottom: 3px solid #8b5cf6; padding-bottom: 10px;">
          💬 New Comment on Task
        </h2>
        ' || CASE WHEN project_name IS NOT NULL THEN
        '<div style="background-color: #f3f4f6; padding: 12px 16px; border-radius: 6px; margin-bottom: 15px;">
          <p style="margin: 0; font-size: 13px; color: #6b7280; margin-bottom: 4px;"><strong>Project:</strong></p>
          <p style="margin: 0; font-size: 15px; color: #1f2937;">' || project_name || '</p>
        </div>' ELSE '' END || '
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
    recipients := array_append(recipients, assignee_email);
  END IF;
  
  IF creator_email IS NOT NULL AND NEW.sender_id != task_record.created_by THEN
    IF NOT creator_email = ANY(recipients) THEN
      recipients := array_append(recipients, creator_email);
    END IF;
  END IF;
  
  -- Add super admins
  FOR recipient_record IN SELECT * FROM get_super_admin_emails() LOOP
    IF recipient_record.email IS NOT NULL AND recipient_record.email != sender_email THEN
      IF NOT recipient_record.email = ANY(recipients) THEN
        recipients := array_append(recipients, recipient_record.email);
      END IF;
    END IF;
  END LOOP;
  
  -- Add network managers
  FOR recipient_record IN SELECT * FROM get_network_manager_emails() LOOP
    IF recipient_record.email IS NOT NULL AND recipient_record.email != sender_email THEN
      IF NOT recipient_record.email = ANY(recipients) THEN
        recipients := array_append(recipients, recipient_record.email);
      END IF;
    END IF;
  END LOOP;
  
  -- Add sales users
  FOR recipient_record IN SELECT * FROM get_sales_emails() LOOP
    IF recipient_record.email IS NOT NULL AND recipient_record.email != sender_email THEN
      IF NOT recipient_record.email = ANY(recipients) THEN
        recipients := array_append(recipients, recipient_record.email);
      END IF;
    END IF;
  END LOOP;
  
  -- If no recipients, exit
  IF array_length(recipients, 1) IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Send to each unique recipient once
  FOR recipient_record IN SELECT unnest(recipients) AS email LOOP
    PERFORM send_email_to_user(
      recipient_record.email,
      subj,
      html_prefix || message_html
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Update the notify_task_assignment function to include network managers and sales
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignee_name text;
  assignee_email text;
  creator_name text;
  creator_email text;
  task_html text;
  project_name text;
  recipient_record record;
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
              <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Assigned To:</td>
              <td style="padding: 12px 0; color: #1f2937;">' || COALESCE(assignee_name, 'Unknown') || '</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Due Date:</td>
              <td style="padding: 12px 0; color: #1f2937;">' || COALESCE(to_char(NEW.due_date, 'FMMonth DD, YYYY'), 'Not set') || '</td>
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
    
    -- Email super admins
    FOR recipient_record IN SELECT * FROM get_super_admin_emails() LOOP
      PERFORM send_email_to_user(
        recipient_record.email,
        '📋 Task Assigned: ' || NEW.title,
        '<h2 style="color: #3b82f6;">New Task Assignment</h2>' ||
        '<p style="color: #6b7280; font-size: 16px;">Hi ' || recipient_record.full_name || ',</p>' ||
        '<p style="color: #6b7280; font-size: 16px;">A new task has been assigned:</p>' ||
        task_html
      );
    END LOOP;
    
    -- Email network managers
    FOR recipient_record IN SELECT * FROM get_network_manager_emails() LOOP
      PERFORM send_email_to_user(
        recipient_record.email,
        '📋 Task Assigned: ' || NEW.title,
        '<h2 style="color: #3b82f6;">New Task Assignment</h2>' ||
        '<p style="color: #6b7280; font-size: 16px;">Hi ' || recipient_record.full_name || ',</p>' ||
        '<p style="color: #6b7280; font-size: 16px;">A new task has been assigned:</p>' ||
        task_html
      );
    END LOOP;
    
    -- Email sales users
    FOR recipient_record IN SELECT * FROM get_sales_emails() LOOP
      PERFORM send_email_to_user(
        recipient_record.email,
        '📋 Task Assigned: ' || NEW.title,
        '<h2 style="color: #3b82f6;">New Task Assignment</h2>' ||
        '<p style="color: #6b7280; font-size: 16px;">Hi ' || recipient_record.full_name || ',</p>' ||
        '<p style="color: #6b7280; font-size: 16px;">A new task has been assigned:</p>' ||
        task_html
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;