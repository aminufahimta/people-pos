-- Create storage bucket for task images
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-images', 'task-images', true);

-- Create task_attachments table
CREATE TABLE public.task_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_messages table
CREATE TABLE public.task_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_attachments
CREATE POLICY "Users can view attachments for their tasks"
ON public.task_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_attachments.task_id
    AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
  )
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'project_manager'::app_role)
);

CREATE POLICY "Assigned employees can upload attachments"
ON public.task_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_attachments.task_id
    AND tasks.assigned_to = auth.uid()
  )
  AND auth.uid() = uploaded_by
);

CREATE POLICY "Uploaders can delete their attachments"
ON public.task_attachments
FOR DELETE
USING (auth.uid() = uploaded_by);

-- RLS Policies for task_messages
CREATE POLICY "Users can view messages for their tasks"
ON public.task_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_messages.task_id
    AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
  )
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'project_manager'::app_role)
);

CREATE POLICY "Task participants can send messages"
ON public.task_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_messages.task_id
    AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
  )
  AND auth.uid() = sender_id
);

-- Storage policies for task-images bucket
CREATE POLICY "Anyone can view task images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'task-images');

CREATE POLICY "Authenticated users can upload task images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'task-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own task images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'task-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable realtime for task_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_messages;