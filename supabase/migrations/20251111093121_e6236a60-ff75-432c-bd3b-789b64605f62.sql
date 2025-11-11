-- Drop the existing trigger first
DROP TRIGGER IF EXISTS notify_task_assignment_trigger ON tasks;

-- Update the notify_task_assignment function to also email the task creator
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
  task_details text;
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    -- Get assignee details
    SELECT full_name, email INTO assignee_name, assignee_email 
    FROM profiles WHERE id = NEW.assigned_to;
    
    -- Get creator details
    SELECT full_name, email INTO creator_name, creator_email 
    FROM profiles WHERE id = NEW.created_by;
    
    -- Build task details
    task_details := '<h2>New Task Assignment</h2>' ||
      '<p><strong>Task:</strong> ' || NEW.title || '</p>' ||
      '<p><strong>Assigned To:</strong> ' || COALESCE(assignee_name, 'Unknown') || '</p>' ||
      '<p><strong>Created By:</strong> ' || COALESCE(creator_name, 'Unknown') || '</p>' ||
      '<p><strong>Priority:</strong> ' || NEW.priority || '</p>' ||
      '<p><strong>Due Date:</strong> ' || COALESCE(to_char(NEW.due_date, 'YYYY-MM-DD'), 'Not set') || '</p>';
    
    -- Notify super admins
    PERFORM notify_super_admins(
      'Task Assigned - ' || NEW.title,
      task_details
    );
    
    -- Also notify the project manager who created the task
    IF creator_email IS NOT NULL THEN
      PERFORM net.http_post(
        url := (SELECT setting_value FROM system_settings WHERE setting_key = 'supabase_url') || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT setting_value FROM system_settings WHERE setting_key = 'supabase_anon_key')
        ),
        body := jsonb_build_object(
          'to', creator_email,
          'subject', 'Task Created - ' || NEW.title,
          'html', '<h2>Task Created Successfully</h2>' ||
            '<p>You have successfully created a new task.</p>' ||
            '<p><strong>Task:</strong> ' || NEW.title || '</p>' ||
            '<p><strong>Assigned To:</strong> ' || COALESCE(assignee_name, 'Unassigned') || '</p>' ||
            '<p><strong>Priority:</strong> ' || NEW.priority || '</p>' ||
            '<p><strong>Due Date:</strong> ' || COALESCE(to_char(NEW.due_date, 'YYYY-MM-DD'), 'Not set') || '</p>' ||
            '<p><strong>Description:</strong> ' || COALESCE(NEW.description, 'No description') || '</p>'
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER notify_task_assignment_trigger
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_assignment();