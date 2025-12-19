-- Add 'under_review' to the allowed task statuses
ALTER TABLE public.tasks DROP CONSTRAINT tasks_status_check;

ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'under_review'::text, 'completed'::text, 'cancelled'::text]));