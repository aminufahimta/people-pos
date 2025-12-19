-- Create email delivery logs table
CREATE TABLE public.email_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  triggered_by TEXT,
  trigger_context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view email logs
CREATE POLICY "Super Admin can view email logs"
  ON public.email_delivery_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow system to insert logs (via edge function with service role)
CREATE POLICY "System can insert email logs"
  ON public.email_delivery_logs
  FOR INSERT
  WITH CHECK (true);

-- Super admin can delete old logs
CREATE POLICY "Super Admin can delete email logs"
  ON public.email_delivery_logs
  FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_email_logs_created_at ON public.email_delivery_logs(created_at DESC);
CREATE INDEX idx_email_logs_recipient ON public.email_delivery_logs(recipient_email);
CREATE INDEX idx_email_logs_status ON public.email_delivery_logs(status);