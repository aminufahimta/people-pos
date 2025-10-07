-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA extensions TO postgres;

-- Schedule daily attendance processing at 11:59 PM every day
SELECT cron.schedule(
  'process-daily-attendance',
  '59 23 * * *', -- Run at 11:59 PM every day
  $$
  SELECT
    net.http_post(
        url:='https://zvjhorkuoxejjvmmmhwd.supabase.co/functions/v1/process-daily-attendance',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2amhvcmt1b3hlamp2bW1taHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTczMDIsImV4cCI6MjA3NDk3MzMwMn0.Ii6OGAUzudnR_vkSGTNzrd-S4YS1DmcnybJubE3a7Jc"}'::jsonb,
        body:=concat('{"date": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);