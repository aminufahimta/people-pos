-- Create employee_audits table
CREATE TABLE public.employee_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Section 1: Personal Information
  name TEXT NOT NULL,
  current_job_title TEXT NOT NULL,
  job_description_attached BOOLEAN DEFAULT false,
  department TEXT,
  manages_staff BOOLEAN DEFAULT false,
  number_of_employees INTEGER,
  grade TEXT,
  salary NUMERIC,
  other_financial_benefit TEXT,
  home_address TEXT,
  home_telephone TEXT,
  job_description TEXT,
  
  -- Section 2-6: Dynamic data stored as JSONB
  employment_history JSONB DEFAULT '[]'::jsonb,
  unpaid_roles JSONB DEFAULT '[]'::jsonb,
  education JSONB DEFAULT '[]'::jsonb,
  training JSONB DEFAULT '[]'::jsonb,
  professional_membership JSONB DEFAULT '[]'::jsonb,
  
  -- Section 7: Supervisory Management
  management_experience TEXT,
  people_supervised TEXT,
  
  -- Section 8: Skills & Competency
  skills_competency JSONB DEFAULT '[]'::jsonb,
  
  -- Section 9: Declaration
  signature TEXT,
  declaration_date DATE,
  
  -- Section 10: Audit Consultant
  performance_scores TEXT,
  audit_comments TEXT,
  final_rating TEXT,
  engagement_status TEXT,
  competency_rating TEXT,
  file_record_status TEXT,
  final_consultant_comments TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft'
);

-- Enable RLS
ALTER TABLE public.employee_audits ENABLE ROW LEVEL SECURITY;

-- Employees can insert and view their own audits
CREATE POLICY "Employees can insert own audits"
ON public.employee_audits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employees can view own audits"
ON public.employee_audits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Employees can update own audits"
ON public.employee_audits
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- HR and Super Admin can view and update all audits
CREATE POLICY "HR and Super Admin can view all audits"
ON public.employee_audits
FOR SELECT
USING (
  has_role(auth.uid(), 'hr_manager'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "HR and Super Admin can update all audits"
ON public.employee_audits
FOR UPDATE
USING (
  has_role(auth.uid(), 'hr_manager'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Super Admin can delete audits
CREATE POLICY "Super Admin can delete audits"
ON public.employee_audits
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_employee_audits_user_id ON public.employee_audits(user_id);
CREATE INDEX idx_employee_audits_status ON public.employee_audits(status);