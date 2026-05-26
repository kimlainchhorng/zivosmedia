-- Create affiliate_click_logs table for tracking outbound clicks
CREATE TABLE public.affiliate_click_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Click identification
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Partner and product info
  partner_id TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  product TEXT NOT NULL, -- flights, hotels, cars, extras, etc.
  page_source TEXT NOT NULL, -- which page the click came from
  
  -- SubID tracking
  subid TEXT NOT NULL,
  subid_components JSONB, -- breakdown of subid parts
  
  -- UTM parameters
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  creator TEXT,
  
  -- Destination
  destination_url TEXT NOT NULL,
  final_url TEXT NOT NULL, -- URL with subid appended
  
  -- Device info
  device_type TEXT,
  user_agent TEXT,
  ip_address INET,
  referrer TEXT
);

-- Create indexes for common queries
CREATE INDEX idx_click_logs_created_at ON public.affiliate_click_logs(created_at DESC);
CREATE INDEX idx_click_logs_partner ON public.affiliate_click_logs(partner_id);
CREATE INDEX idx_click_logs_product ON public.affiliate_click_logs(product);
CREATE INDEX idx_click_logs_utm_source ON public.affiliate_click_logs(utm_source);
CREATE INDEX idx_click_logs_creator ON public.affiliate_click_logs(creator);
CREATE INDEX idx_click_logs_subid ON public.affiliate_click_logs(subid);

-- Enable RLS
ALTER TABLE public.affiliate_click_logs ENABLE ROW LEVEL SECURITY;

-- Admin can view all logs
CREATE POLICY "Admins can view all click logs"
  ON public.affiliate_click_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert logs (for tracking)
CREATE POLICY "Anyone can insert click logs"
  ON public.affiliate_click_logs FOR INSERT
  WITH CHECK (true);

-- Admins can delete old logs
CREATE POLICY "Admins can delete click logs"
  ON public.affiliate_click_logs FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));