-- Create enum for suspension status
CREATE TYPE suspension_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'completed');

-- Add suspension and strike fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspension_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS strike_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_terminated BOOLEAN DEFAULT FALSE;

-- Create suspensions table
CREATE TABLE public.suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  status suspension_status NOT NULL DEFAULT 'pending',
  suspension_start TIMESTAMP WITH TIME ZONE,
  suspension_end TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT NOT NULL,
  strike_number INTEGER,
  salary_deduction_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on suspensions table
ALTER TABLE public.suspensions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suspensions
CREATE POLICY "Super Admin and HR can view all suspensions"
ON public.suspensions
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'hr_manager'::app_role)
);

CREATE POLICY "Employees can view own suspensions"
ON public.suspensions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Super Admin can manage all suspensions"
ON public.suspensions
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "HR Manager can create suspensions"
ON public.suspensions
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'hr_manager'::app_role) AND
  auth.uid() = created_by
);

-- Trigger to update updated_at
CREATE TRIGGER update_suspensions_updated_at
BEFORE UPDATE ON public.suspensions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically activate approved suspensions
CREATE OR REPLACE FUNCTION public.activate_suspension()
RETURNS TRIGGER AS $$
BEGIN
  -- If suspension is approved and has a start date
  IF NEW.status = 'approved' AND NEW.suspension_start IS NOT NULL THEN
    -- Update profile to suspended
    UPDATE public.profiles
    SET 
      is_suspended = TRUE,
      suspension_end_date = NEW.suspension_end,
      strike_count = COALESCE(strike_count, 0) + COALESCE(NEW.strike_number, 0)
    WHERE id = NEW.user_id;
    
    -- Update suspension status to active
    NEW.status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER activate_suspension_trigger
BEFORE UPDATE ON public.suspensions
FOR EACH ROW
WHEN (OLD.status = 'pending' AND NEW.status = 'approved')
EXECUTE FUNCTION public.activate_suspension();

-- Function to complete expired suspensions
CREATE OR REPLACE FUNCTION public.check_suspension_expiry()
RETURNS void AS $$
BEGIN
  -- Update profiles where suspension has ended
  UPDATE public.profiles
  SET 
    is_suspended = FALSE,
    suspension_end_date = NULL
  WHERE 
    is_suspended = TRUE 
    AND suspension_end_date IS NOT NULL 
    AND suspension_end_date < NOW();
  
  -- Update suspension records to completed
  UPDATE public.suspensions
  SET status = 'completed'
  WHERE 
    status = 'active' 
    AND suspension_end < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;