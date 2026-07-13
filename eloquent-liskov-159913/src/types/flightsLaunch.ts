/**
 * Flights Launch Types - Stub
 */
export type FlightsLaunchPhase = "internal_test" | "private_beta" | "public_live";

export interface FlightsLaunchSettings {
  id: string;
  launch_phase: FlightsLaunchPhase;
  phase: FlightsLaunchPhase;
  can_book: boolean;
  emergency_pause: boolean;
  emergency_pause_reason: string | null;
  allowed_emails: string[];
  max_beta_users: number;
  seller_of_travel_verified: boolean;
  terms_privacy_linked: boolean;
  support_email_configured: boolean;
  stripe_live_enabled: boolean;
  duffel_live_configured: boolean;
  refund_flow_tested: boolean;
  checklist: FlightsLaunchChecklist;
  created_at: string;
  updated_at: string;
}

export interface FlightsLaunchChecklist {
  api_connected: boolean;
  test_booking_completed: boolean;
  compliance_reviewed: boolean;
  pricing_verified: boolean;
  support_flow_tested: boolean;
  seller_of_travel_verified: boolean;
  terms_privacy_linked: boolean;
  support_email_configured: boolean;
  stripe_live_enabled: boolean;
  duffel_live_configured: boolean;
  refund_flow_tested: boolean;
}
