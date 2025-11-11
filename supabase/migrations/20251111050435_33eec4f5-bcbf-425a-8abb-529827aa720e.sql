-- Create notification settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, notification_type)
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Super Admin can manage notification settings
CREATE POLICY "Super Admin can manage notification settings"
ON public.notification_settings
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- All authenticated users can view notification settings
CREATE POLICY "Users can view notification settings"
ON public.notification_settings
FOR SELECT
TO authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default notification settings for each role
INSERT INTO public.notification_settings (role, notification_type, description, enabled) VALUES
-- Super Admin notifications
('super_admin', 'new_user_signup', 'Notified when a new user signs up', true),
('super_admin', 'task_completion', 'Notified when tasks are completed', true),
('super_admin', 'task_assignment', 'Notified when tasks are assigned', true),
('super_admin', 'document_verification', 'Notified when documents are verified', true),
('super_admin', 'suspension_approval', 'Notified when suspensions are approved', true),

-- HR Manager notifications
('hr_manager', 'new_user_signup', 'Notified when a new user signs up', true),
('hr_manager', 'document_verification', 'Notified when documents are verified', true),
('hr_manager', 'suspension_approval', 'Notified when suspensions are approved', true),
('hr_manager', 'attendance_issues', 'Notified about attendance issues', true),

-- Project Manager notifications
('project_manager', 'task_assignment', 'Notified when tasks are assigned to their projects', true),
('project_manager', 'task_completion', 'Notified when tasks in their projects are completed', true),
('project_manager', 'task_updates', 'Notified about updates to tasks in their projects', true),

-- Employee notifications
('employee', 'task_assignment', 'Notified when tasks are assigned to them', true),
('employee', 'suspension_notice', 'Notified about suspensions', true),
('employee', 'document_status', 'Notified about document verification status', true),
('employee', 'salary_updates', 'Notified about salary changes', true);