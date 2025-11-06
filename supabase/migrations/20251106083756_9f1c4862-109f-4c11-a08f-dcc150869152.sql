-- Add missing foreign key relationships so nested selects like sender:profiles(full_name) work
-- and to ensure referential integrity for message/uploader profiles.

-- 1) task_messages.sender_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_messages_sender_id_fkey'
  ) THEN
    ALTER TABLE public.task_messages
    ADD CONSTRAINT task_messages_sender_id_fkey
    FOREIGN KEY (sender_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- 2) task_attachments.uploaded_by -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_attachments_uploaded_by_fkey'
  ) THEN
    ALTER TABLE public.task_attachments
    ADD CONSTRAINT task_attachments_uploaded_by_fkey
    FOREIGN KEY (uploaded_by)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;
