-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-documents',
  'employee-documents',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
);

-- Create RLS policies for employee documents bucket
CREATE POLICY "Employees can upload their own documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'employee-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Employees can view their own documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'employee-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "HR and Super Admin can view all employee documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'employee-documents'
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('hr_manager', 'super_admin')
    )
  )
);

CREATE POLICY "Super Admin can delete employee documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'employee-documents'
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

-- Create table to track employee documents
CREATE TABLE public.employee_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on employee_documents
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for employee_documents
CREATE POLICY "Employees can view their own documents"
ON public.employee_documents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Employees can insert their own documents"
ON public.employee_documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "HR and Super Admin can view all documents"
ON public.employee_documents
FOR SELECT
USING (
  has_role(auth.uid(), 'hr_manager'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "HR and Super Admin can update documents"
ON public.employee_documents
FOR UPDATE
USING (
  has_role(auth.uid(), 'hr_manager'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Super Admin can delete documents"
ON public.employee_documents
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));