-- Add medical history fields to biodata_submissions table
ALTER TABLE public.biodata_submissions
ADD COLUMN IF NOT EXISTS medical_conditions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS symptoms_conditions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS other_medical_conditions TEXT,
ADD COLUMN IF NOT EXISTS medications TEXT,
ADD COLUMN IF NOT EXISTS workplace_accommodations TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_details TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS offer_letter_path TEXT,
ADD COLUMN IF NOT EXISTS confirmation_date DATE,
ADD COLUMN IF NOT EXISTS send_copy_to_email BOOLEAN DEFAULT false;

-- Make emergency_contact_details nullable first, then we'll require it in the form
ALTER TABLE public.biodata_submissions
ALTER COLUMN emergency_contact_details DROP NOT NULL;