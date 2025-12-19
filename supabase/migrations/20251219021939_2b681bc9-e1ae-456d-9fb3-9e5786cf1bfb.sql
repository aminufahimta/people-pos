-- Prevent duplicate emails when the creator is also in recipient groups (e.g., super admin)

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
    
    -- Notify super admins (skip if the creator is also a super admin to avoid duplicates)
    FOR admin_record IN SELECT * FROM get_super_admin_emails()
    LOOP
      IF admin_record.email IS NOT NULL AND admin_record.email IS DISTINCT FROM creator_email THEN
        PERFORM send_email_to_user(
          admin_record.email,
          '⏳ Task Pending Review: ' || NEW.title,
          '<h2 style="color: #f59e0b;">Task Awaiting Review</h2>' ||
          '<p style="color: #6b7280; font-size: 16px;">Hi ' || admin_record.full_name || ',</p>' ||
          '<p style="color: #6b7280; font-size: 16px;">A task has been marked as completed and requires review:</p>' ||
          task_html
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

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
    
    -- Email the assigned technician if enabled
    IF assignee_email IS NOT NULL AND is_notification_enabled('employee'::app_role, 'task_assignment') THEN
      PERFORM send_email_to_user(
        assignee_email,
        '🎯 New Task Assigned: ' || NEW.title,
        '<h2 style="color: #3b82f6;">You have been assigned a new task!</h2>' ||
        '<p style="color: #6b7280; font-size: 16px;">Hi ' || COALESCE(assignee_name, 'there') || ',</p>' ||
        '<p style="color: #6b7280; font-size: 16px;">' || COALESCE(creator_name, 'Your manager') || ' has assigned you a new task. Please review the details below:</p>' ||
        task_html
      );
    END IF;
    
    -- Email the project manager who created the task if enabled
    IF creator_email IS NOT NULL AND is_notification_enabled('project_manager'::app_role, 'task_assignment') THEN
      PERFORM send_email_to_user(
        creator_email,
        '✅ Task Created: ' || NEW.title,
        '<h2 style="color: #10b981;">Task Created Successfully!</h2>' ||
        '<p style="color: #6b7280; font-size: 16px;">Hi ' || COALESCE(creator_name, 'there') || ',</p>' ||
        '<p style="color: #6b7280; font-size: 16px;">Your task has been created and assigned to ' || COALESCE(assignee_name, 'a team member') || '. Here are the details:</p>' ||
        task_html
      );
    END IF;
    
    -- Email super admins if enabled (skip duplicates)
    IF is_notification_enabled('super_admin'::app_role, 'task_assignment') THEN
      FOR recipient_record IN SELECT * FROM get_super_admin_emails() LOOP
        IF recipient_record.email IS NOT NULL
           AND recipient_record.email IS DISTINCT FROM creator_email
           AND recipient_record.email IS DISTINCT FROM assignee_email THEN
          PERFORM send_email_to_user(
            recipient_record.email,
            '📋 Task Assigned: ' || NEW.title,
            '<h2 style="color: #3b82f6;">New Task Assignment</h2>' ||
            '<p style="color: #6b7280; font-size: 16px;">Hi ' || recipient_record.full_name || ',</p>' ||
            '<p style="color: #6b7280; font-size: 16px;">A new task has been assigned:</p>' ||
            task_html
          );
        END IF;
      END LOOP;
    END IF;
    
    -- Email network managers if enabled (skip duplicates)
    IF is_notification_enabled('network_manager'::app_role, 'task_assignment') THEN
      FOR recipient_record IN SELECT * FROM get_network_manager_emails() LOOP
        IF recipient_record.email IS NOT NULL
           AND recipient_record.email IS DISTINCT FROM creator_email
           AND recipient_record.email IS DISTINCT FROM assignee_email THEN
          PERFORM send_email_to_user(
            recipient_record.email,
            '📋 Task Assigned: ' || NEW.title,
            '<h2 style="color: #3b82f6;">New Task Assignment</h2>' ||
            '<p style="color: #6b7280; font-size: 16px;">Hi ' || recipient_record.full_name || ',</p>' ||
            '<p style="color: #6b7280; font-size: 16px;">A new task has been assigned:</p>' ||
            task_html
          );
        END IF;
      END LOOP;
    END IF;
    
    -- Email sales users if enabled (skip duplicates)
    IF is_notification_enabled('sales'::app_role, 'task_assignment') THEN
      FOR recipient_record IN SELECT * FROM get_sales_emails() LOOP
        IF recipient_record.email IS NOT NULL
           AND recipient_record.email IS DISTINCT FROM creator_email
           AND recipient_record.email IS DISTINCT FROM assignee_email THEN
          PERFORM send_email_to_user(
            recipient_record.email,
            '📋 Task Assigned: ' || NEW.title,
            '<h2 style="color: #3b82f6;">New Task Assignment</h2>' ||
            '<p style="color: #6b7280; font-size: 16px;">Hi ' || recipient_record.full_name || ',</p>' ||
            '<p style="color: #6b7280; font-size: 16px;">A new task has been assigned:</p>' ||
            task_html
          );
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;