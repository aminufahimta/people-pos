-- Add project_manager role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'project_manager';