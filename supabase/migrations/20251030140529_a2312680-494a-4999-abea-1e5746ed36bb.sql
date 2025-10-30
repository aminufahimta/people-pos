-- Add SMTP configuration settings to system_settings
INSERT INTO public.system_settings (setting_key, setting_value, description) 
VALUES 
  ('smtp_host', '', 'SMTP server host (e.g., smtp.gmail.com)'),
  ('smtp_port', '587', 'SMTP server port (587 for TLS, 465 for SSL)'),
  ('smtp_username', '', 'SMTP username/email address'),
  ('smtp_password', '', 'SMTP password or app password'),
  ('smtp_from_email', '', 'From email address for notifications'),
  ('smtp_from_name', 'HR Management System', 'From name for notifications'),
  ('smtp_encryption', 'tls', 'Encryption type: tls or ssl'),
  ('email_notifications_enabled', 'false', 'Enable/disable email notifications')
ON CONFLICT (setting_key) DO NOTHING;