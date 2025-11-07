-- Create a function to get super admin emails
CREATE OR REPLACE FUNCTION get_super_admin_emails()
RETURNS TABLE(email text, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.email, p.full_name
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'super_admin'::app_role
  AND p.email IS NOT NULL
$$;

-- Create a function to notify super admins
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
BEGIN
  -- Check if email notifications are enabled
  SELECT setting_value INTO email_enabled
  FROM system_settings
  WHERE setting_key = 'email_notifications_enabled';
  
  IF email_enabled != 'true' THEN
    RETURN;
  END IF;

  -- Send email to each super admin
  FOR admin_record IN SELECT * FROM get_super_admin_emails()
  LOOP
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
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

-- Trigger function for new user signups
CREATE OR REPLACE FUNCTION notify_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_super_admins(
    'New User Signup - ' || NEW.full_name,
    '<h2>New User Signup</h2>' ||
    '<p><strong>Name:</strong> ' || NEW.full_name || '</p>' ||
    '<p><strong>Email:</strong> ' || NEW.email || '</p>' ||
    '<p><strong>Date:</strong> ' || to_char(NEW.created_at, 'YYYY-MM-DD HH24:MI') || '</p>'
  );
  RETURN NEW;
END;
$$;

-- Trigger function for task assignments
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignee_name text;
  creator_name text;
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    SELECT full_name INTO assignee_name FROM profiles WHERE id = NEW.assigned_to;
    SELECT full_name INTO creator_name FROM profiles WHERE id = NEW.created_by;
    
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
$$;

-- Trigger function for task completions
CREATE OR REPLACE FUNCTION notify_task_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignee_name text;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT full_name INTO assignee_name FROM profiles WHERE id = NEW.assigned_to;
    
    PERFORM notify_super_admins(
      'Task Completed - ' || NEW.title,
      '<h2>Task Completed</h2>' ||
      '<p><strong>Task:</strong> ' || NEW.title || '</p>' ||
      '<p><strong>Completed By:</strong> ' || COALESCE(assignee_name, 'Unknown') || '</p>' ||
      '<p><strong>Completed At:</strong> ' || to_char(NEW.completed_at, 'YYYY-MM-DD HH24:MI') || '</p>'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function for document verifications
CREATE OR REPLACE FUNCTION notify_document_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  employee_name text;
  verifier_name text;
BEGIN
  IF NEW.verified = true AND (OLD.verified IS NULL OR OLD.verified = false) THEN
    SELECT full_name INTO employee_name FROM profiles WHERE id = NEW.user_id;
    SELECT full_name INTO verifier_name FROM profiles WHERE id = NEW.verified_by;
    
    PERFORM notify_super_admins(
      'Document Verified - ' || NEW.document_type,
      '<h2>Document Verified</h2>' ||
      '<p><strong>Employee:</strong> ' || COALESCE(employee_name, 'Unknown') || '</p>' ||
      '<p><strong>Document Type:</strong> ' || NEW.document_type || '</p>' ||
      '<p><strong>Verified By:</strong> ' || COALESCE(verifier_name, 'Unknown') || '</p>' ||
      '<p><strong>Verified At:</strong> ' || to_char(NEW.verified_at, 'YYYY-MM-DD HH24:MI') || '</p>'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function for suspension approvals
CREATE OR REPLACE FUNCTION notify_suspension_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  employee_name text;
  approver_name text;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    SELECT full_name INTO employee_name FROM profiles WHERE id = NEW.user_id;
    SELECT full_name INTO approver_name FROM profiles WHERE id = NEW.approved_by;
    
    PERFORM notify_super_admins(
      'Suspension Approved - ' || COALESCE(employee_name, 'Employee'),
      '<h2>Suspension Approved</h2>' ||
      '<p><strong>Employee:</strong> ' || COALESCE(employee_name, 'Unknown') || '</p>' ||
      '<p><strong>Reason:</strong> ' || NEW.reason || '</p>' ||
      '<p><strong>Start Date:</strong> ' || to_char(NEW.suspension_start, 'YYYY-MM-DD') || '</p>' ||
      '<p><strong>End Date:</strong> ' || to_char(NEW.suspension_end, 'YYYY-MM-DD') || '</p>' ||
      '<p><strong>Approved By:</strong> ' || COALESCE(approver_name, 'Unknown') || '</p>'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS on_new_user_signup ON profiles;
CREATE TRIGGER on_new_user_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_user_signup();

DROP TRIGGER IF EXISTS on_task_assignment ON tasks;
CREATE TRIGGER on_task_assignment
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assignment();

DROP TRIGGER IF EXISTS on_task_completion ON tasks;
CREATE TRIGGER on_task_completion
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_completion();

DROP TRIGGER IF EXISTS on_document_verification ON employee_documents;
CREATE TRIGGER on_document_verification
  AFTER UPDATE ON employee_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_verification();

DROP TRIGGER IF EXISTS on_suspension_approval ON suspensions;
CREATE TRIGGER on_suspension_approval
  AFTER UPDATE ON suspensions
  FOR EACH ROW
  EXECUTE FUNCTION notify_suspension_approval();