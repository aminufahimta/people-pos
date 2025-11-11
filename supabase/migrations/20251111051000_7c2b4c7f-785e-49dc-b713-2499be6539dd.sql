-- Create activity logs table
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX idx_activity_logs_table_name ON public.activity_logs(table_name);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only Super Admin can view activity logs
CREATE POLICY "Super Admin can view all activity logs"
ON public.activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- System can insert activity logs (for triggers)
CREATE POLICY "System can insert activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (true);

-- Create function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_action_type TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_logs (
    user_id,
    action_type,
    table_name,
    record_id,
    description,
    metadata
  ) VALUES (
    p_user_id,
    p_action_type,
    p_table_name,
    p_record_id,
    p_description,
    p_metadata
  );
END;
$$;

-- Create trigger function for profile updates
CREATE OR REPLACE FUNCTION public.log_profile_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_type TEXT;
  v_description TEXT;
  v_user_name TEXT;
BEGIN
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = COALESCE(NEW.id, OLD.id);
  
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'create';
    v_description := 'New user profile created: ' || COALESCE(v_user_name, 'Unknown');
  ELSIF TG_OP = 'UPDATE' THEN
    v_action_type := 'update';
    IF NEW.is_approved != OLD.is_approved AND NEW.is_approved = true THEN
      v_description := 'User approved: ' || COALESCE(v_user_name, 'Unknown');
    ELSIF NEW.is_suspended != OLD.is_suspended THEN
      v_description := 'User suspension status changed: ' || COALESCE(v_user_name, 'Unknown');
    ELSE
      v_description := 'User profile updated: ' || COALESCE(v_user_name, 'Unknown');
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action_type := 'delete';
    v_description := 'User profile deleted: ' || COALESCE(v_user_name, 'Unknown');
  END IF;
  
  PERFORM log_activity(
    auth.uid(),
    v_action_type,
    'profiles',
    COALESCE(NEW.id, OLD.id),
    v_description,
    jsonb_build_object('operation', TG_OP)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger function for task activities
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_type TEXT;
  v_description TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'create';
    v_description := 'New task created: ' || NEW.title;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action_type := 'update';
    IF NEW.status != OLD.status THEN
      v_description := 'Task status changed to ' || NEW.status || ': ' || NEW.title;
    ELSIF NEW.assigned_to != OLD.assigned_to THEN
      v_description := 'Task reassigned: ' || NEW.title;
    ELSE
      v_description := 'Task updated: ' || NEW.title;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action_type := 'delete';
    v_description := 'Task deleted: ' || OLD.title;
  END IF;
  
  PERFORM log_activity(
    auth.uid(),
    v_action_type,
    'tasks',
    COALESCE(NEW.id, OLD.id),
    v_description,
    jsonb_build_object(
      'operation', TG_OP,
      'status', COALESCE(NEW.status, OLD.status),
      'assigned_to', COALESCE(NEW.assigned_to, OLD.assigned_to)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger function for attendance activities
CREATE OR REPLACE FUNCTION public.log_attendance_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_type TEXT;
  v_description TEXT;
  v_user_name TEXT;
BEGIN
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'create';
    v_description := 'Attendance record created for ' || COALESCE(v_user_name, 'Unknown');
  ELSIF TG_OP = 'UPDATE' THEN
    v_action_type := 'update';
    IF NEW.clock_in IS DISTINCT FROM OLD.clock_in AND NEW.clock_in IS NOT NULL THEN
      v_description := COALESCE(v_user_name, 'Unknown') || ' clocked in';
    ELSIF NEW.clock_out IS DISTINCT FROM OLD.clock_out AND NEW.clock_out IS NOT NULL THEN
      v_description := COALESCE(v_user_name, 'Unknown') || ' clocked out';
    ELSE
      v_description := 'Attendance updated for ' || COALESCE(v_user_name, 'Unknown');
    END IF;
  END IF;
  
  PERFORM log_activity(
    COALESCE(NEW.user_id, OLD.user_id),
    v_action_type,
    'attendance',
    COALESCE(NEW.id, OLD.id),
    v_description,
    jsonb_build_object(
      'date', COALESCE(NEW.date, OLD.date),
      'status', COALESCE(NEW.status, OLD.status)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger function for suspension activities
CREATE OR REPLACE FUNCTION public.log_suspension_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_type TEXT;
  v_description TEXT;
  v_user_name TEXT;
BEGIN
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'create';
    v_description := 'Suspension created for ' || COALESCE(v_user_name, 'Unknown');
  ELSIF TG_OP = 'UPDATE' THEN
    v_action_type := 'update';
    IF NEW.status != OLD.status THEN
      v_description := 'Suspension status changed to ' || NEW.status || ' for ' || COALESCE(v_user_name, 'Unknown');
    ELSE
      v_description := 'Suspension updated for ' || COALESCE(v_user_name, 'Unknown');
    END IF;
  END IF;
  
  PERFORM log_activity(
    auth.uid(),
    v_action_type,
    'suspensions',
    COALESCE(NEW.id, OLD.id),
    v_description,
    jsonb_build_object(
      'status', COALESCE(NEW.status::text, OLD.status::text),
      'reason', COALESCE(NEW.reason, OLD.reason)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger function for salary activities
CREATE OR REPLACE FUNCTION public.log_salary_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_type TEXT;
  v_description TEXT;
  v_user_name TEXT;
BEGIN
  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'create';
    v_description := 'Salary record created for ' || COALESCE(v_user_name, 'Unknown');
  ELSIF TG_OP = 'UPDATE' THEN
    v_action_type := 'update';
    IF NEW.base_salary != OLD.base_salary THEN
      v_description := 'Base salary updated for ' || COALESCE(v_user_name, 'Unknown');
    ELSIF NEW.total_deductions != OLD.total_deductions THEN
      v_description := 'Salary deductions updated for ' || COALESCE(v_user_name, 'Unknown');
    ELSE
      v_description := 'Salary information updated for ' || COALESCE(v_user_name, 'Unknown');
    END IF;
  END IF;
  
  PERFORM log_activity(
    auth.uid(),
    v_action_type,
    'salary_info',
    COALESCE(NEW.id, OLD.id),
    v_description,
    jsonb_build_object(
      'base_salary', COALESCE(NEW.base_salary, OLD.base_salary),
      'current_salary', COALESCE(NEW.current_salary, OLD.current_salary)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach triggers to tables
CREATE TRIGGER log_profile_changes
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_profile_activity();

CREATE TRIGGER log_task_changes
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.log_task_activity();

CREATE TRIGGER log_attendance_changes
AFTER INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.log_attendance_activity();

CREATE TRIGGER log_suspension_changes
AFTER INSERT OR UPDATE ON public.suspensions
FOR EACH ROW EXECUTE FUNCTION public.log_suspension_activity();

CREATE TRIGGER log_salary_changes
AFTER INSERT OR UPDATE ON public.salary_info
FOR EACH ROW EXECUTE FUNCTION public.log_salary_activity();