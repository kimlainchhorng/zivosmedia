-- Fix security issue: p2p_damage_evidence table exposing damage photos publicly
-- Access should be restricted to: parties involved in the booking (renter/owner) and admins

-- Ensure RLS is enabled
ALTER TABLE public.p2p_damage_evidence ENABLE ROW LEVEL SECURITY;

-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "Allow public read access" ON public.p2p_damage_evidence;
DROP POLICY IF EXISTS "Allow public insert" ON public.p2p_damage_evidence;
DROP POLICY IF EXISTS "Allow insert for all" ON public.p2p_damage_evidence;
DROP POLICY IF EXISTS "Allow select for all" ON public.p2p_damage_evidence;

-- Create a security definer function to check if user is party to the damage report
CREATE OR REPLACE FUNCTION public.is_damage_report_party(_user_id uuid, _damage_report_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.p2p_damage_reports dr
    JOIN public.p2p_bookings b ON b.id = dr.booking_id
    LEFT JOIN public.car_owner_profiles cop ON cop.id = b.owner_id
    WHERE dr.id = _damage_report_id
      AND (
        b.renter_id = _user_id           -- User is the renter
        OR cop.user_id = _user_id        -- User is the car owner
      )
  )
$$;

-- Parties involved and admins can view evidence
CREATE POLICY "Parties and admins can view damage evidence"
ON public.p2p_damage_evidence
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_damage_report_party(auth.uid(), damage_report_id)
);

-- Parties involved can insert evidence for their damage reports
CREATE POLICY "Parties can insert damage evidence"
ON public.p2p_damage_evidence
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_damage_report_party(auth.uid(), damage_report_id)
);

-- Parties involved and admins can update evidence
CREATE POLICY "Parties and admins can update damage evidence"
ON public.p2p_damage_evidence
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_damage_report_party(auth.uid(), damage_report_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.is_damage_report_party(auth.uid(), damage_report_id)
);

-- Only admins can delete evidence (preservation for disputes)
CREATE POLICY "Admins can delete damage evidence"
ON public.p2p_damage_evidence
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));