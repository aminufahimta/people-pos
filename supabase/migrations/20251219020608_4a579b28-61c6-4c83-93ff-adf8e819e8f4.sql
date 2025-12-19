-- Remove duplicate trigger on task_messages that causes double emails
DROP TRIGGER IF EXISTS on_task_message_created ON public.task_messages;