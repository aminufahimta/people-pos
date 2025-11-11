-- Create email_history table to track sent emails
CREATE TABLE public.email_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sent_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_to TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  customer_name TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;

-- Project Managers and Super Admins can view all email history
CREATE POLICY "Project Managers and Super Admins can view email history"
ON public.email_history
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'project_manager'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Project Managers and Super Admins can insert email history
CREATE POLICY "Project Managers and Super Admins can insert email history"
ON public.email_history
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'project_manager'::app_role) OR 
   has_role(auth.uid(), 'super_admin'::app_role)) AND
  auth.uid() = sent_by
);

-- Create index for better query performance
CREATE INDEX idx_email_history_sent_by ON public.email_history(sent_by);
CREATE INDEX idx_email_history_sent_at ON public.email_history(sent_at DESC);