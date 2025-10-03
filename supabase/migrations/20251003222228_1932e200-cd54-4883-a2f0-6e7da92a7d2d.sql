-- Create settings table for system-wide configuration
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage settings
CREATE POLICY "Super Admin can manage settings"
ON public.system_settings
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Insert default deduction percentage (e.g., 100% = full daily rate)
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('absence_deduction_percentage', '100', 'Percentage of daily rate to deduct for absences (0-100)'),
  ('working_days_per_month', '22', 'Number of working days per month for salary calculations')
ON CONFLICT (setting_key) DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();