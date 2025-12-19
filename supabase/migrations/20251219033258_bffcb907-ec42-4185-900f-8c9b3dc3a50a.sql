-- Add payment tracking fields to tasks table
ALTER TABLE public.tasks
ADD COLUMN is_paid boolean DEFAULT false,
ADD COLUMN paid_at timestamp with time zone,
ADD COLUMN paid_by uuid REFERENCES public.profiles(id);