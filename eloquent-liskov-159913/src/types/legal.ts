/**
 * ZIVO Legal, Liability & Regulatory Protection Types
 */

export interface LegalPolicy {
  id: string;
  policy_type: PolicyType;
  version: string;
  title: string;
  content: string;
  summary: string | null;
  effective_at: string;
  expires_at: string | null;
  is_active: boolean;
  applies_to: ServiceType[];
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserConsentLog {
  id: string;
  user_id: string;
  policy_id: string | null;
  policy_type: PolicyType;
  policy_version: string;
  consent_given: boolean;
  consent_method: ConsentMethod;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  page_url: string | null;
  created_at: string;
}

export interface RoleTerms {
  id: string;
  role_type: RoleType;
  version: string;
  title: string;
  content: string;
  responsibilities: string[];
  liabilities: string[];
  is_active: boolean;
  effective_at: string;
  created_at: string;
  updated_at: string;
}

export interface RoleTermsAcceptance {
  id: string;
  user_id: string;
  role_type: RoleType;
  role_terms_id: string | null;
  terms_version: string;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface SellerOfTravelStatus {
  id: string;
  state_code: string;
  state_name: string;
  registration_number: string | null;
  status: SOTStatus;
  registration_date: string | null;
  expiry_date: string | null;
  renewal_date: string | null;
  bond_amount: number | null;
  notes: string | null;
  document_url: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegalDispute {
  id: string;
  dispute_type: DisputeType;
  service_type: ServiceType;
  complainant_id: string | null;
  complainant_type: RoleType | null;
  respondent_id: string | null;
  respondent_type: RoleType | null;
  booking_id: string | null;
  amount_disputed: number | null;
  currency: string;
  description: string | null;
  status: DisputeStatus;
  resolution: string | null;
  resolution_amount: number | null;
  resolved_by: string | null;
  resolved_at: string | null;
  escalated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegalAuditLog {
  id: string;
  action_type: string;
  actor_id: string | null;
  actor_type: string | null;
  target_type: string | null;
  target_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// Enums
export type PolicyType = 
  | 'terms' 
  | 'privacy' 
  | 'seller_of_travel' 
  | 'transportation' 
  | 'car_rental' 
  | 'insurance' 
  | 'refunds';

export type ServiceType = 'flights' | 'cars' | 'rides' | 'eats' | 'move' | 'hotels';

export type RoleType = 
  | 'customer' 
  | 'driver' 
  | 'car_owner' 
  | 'fleet_owner' 
  | 'restaurant_partner';

export type ConsentMethod = 'checkbox' | 'click' | 'implicit';

export type SOTStatus = 'pending' | 'active' | 'expired' | 'exempt' | 'not_required';

export type DisputeType = 'chargeback' | 'arbitration' | 'claim' | 'complaint';

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'escalated' | 'closed';

// Policy content structure
export interface PolicySection {
  title: string;
  content: string;
  subsections?: PolicySection[];
}

// Consent request
export interface ConsentRequest {
  policyType: PolicyType;
  policyVersion: string;
  pageUrl?: string;
}

// Legal summary for dashboard
export interface LegalSummary {
  activePolicies: number;
  pendingConsents: number;
  openDisputes: number;
  sotStatesActive: number;
  sotStatesPending: number;
  recentAuditLogs: number;
}
