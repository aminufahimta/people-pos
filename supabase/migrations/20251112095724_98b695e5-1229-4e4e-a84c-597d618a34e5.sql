-- Create biodata submissions table and storage bucket
CREATE TABLE IF NOT EXISTS public.biodata_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Personal Information
  company_hired_to TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  residential_address TEXT NOT NULL,
  nationality TEXT,
  state TEXT NOT NULL,
  marital_status TEXT NOT NULL,
  
  -- Previous Employment
  last_employer_name_address TEXT NOT NULL,
  last_employer_contact TEXT NOT NULL,
  
  -- Pension Details
  pension_pin TEXT,
  pension_provider_name TEXT,
  
  -- Education
  certification TEXT,
  
  -- Next of Kin
  next_of_kin_contact TEXT NOT NULL,
  next_of_kin_address TEXT NOT NULL,
  
  -- Previous Employers
  first_previous_employer TEXT NOT NULL,
  second_previous_employer TEXT NOT NULL,
  
  -- Document Paths (stored in biodata-documents bucket)
  utility_bill_path TEXT,
  education_certificate_path TEXT,
  birth_certificate_path TEXT,
  passport_photo_path TEXT,
  id_card_path TEXT,
  cv_path TEXT,
  first_guarantor_form_path TEXT,
  first_guarantor_id_path TEXT,
  second_guarantor_form_path TEXT,
  second_guarantor_id_path TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.biodata_submissions ENABLE ROW LEVEL SECURITY;

-- Super Admin and HR Manager can view all submissions
CREATE POLICY "Super Admin and HR can view all biodata submissions"
ON public.biodata_submissions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'hr_manager'::app_role)
);

-- Super Admin and HR Manager can update submissions
CREATE POLICY "Super Admin and HR can update biodata submissions"
ON public.biodata_submissions
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'hr_manager'::app_role)
);

-- Super Admin can delete submissions
CREATE POLICY "Super Admin can delete biodata submissions"
ON public.biodata_submissions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Anyone can insert (public form submission)
CREATE POLICY "Anyone can submit biodata"
ON public.biodata_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create storage bucket for biodata documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('biodata-documents', 'biodata-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for biodata documents
CREATE POLICY "Super Admin and HR can view biodata documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'biodata-documents' AND
  (has_role(auth.uid(), 'super_admin'::app_role) OR 
   has_role(auth.uid(), 'hr_manager'::app_role))
);

-- Anyone can upload during form submission
CREATE POLICY "Anyone can upload biodata documents"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'biodata-documents');

-- Super Admin can delete documents
CREATE POLICY "Super Admin can delete biodata documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'biodata-documents' AND
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Create index for faster queries
CREATE INDEX idx_biodata_created_at ON public.biodata_submissions(created_at DESC);
CREATE INDEX idx_biodata_status ON public.biodata_submissions(status);