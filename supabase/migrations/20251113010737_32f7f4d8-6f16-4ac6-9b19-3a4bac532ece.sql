-- Add unique constraint to growth_task_completions for upsert to work
ALTER TABLE growth_task_completions 
ADD CONSTRAINT growth_task_completions_task_user_unique 
UNIQUE (task_id, user_id);