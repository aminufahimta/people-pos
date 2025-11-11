-- Remove duplicate task assignment notification trigger
-- Only keep notify_task_assignment_trigger
DROP TRIGGER IF EXISTS on_task_assignment ON public.tasks;