/**
 * Enterprise Security Types
 */

// Role Types
export type AppRole = 
  | 'customer'
  | 'driver'
  | 'car_owner'
  | 'fleet_owner'
  | 'restaurant_partner'
  | 'admin'
  | 'super_admin'
  | 'moderator'
  | 'user';

export interface RolePermission {
  id: string;
  role: string;
  resource: string;
  action: string;
  conditions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Policy Consent Types
export type PolicyType = 
  | 'terms'
  | 'privacy'
  | 'cookies'
  | 'seller_of_travel'
  | 'marketing'
  | 'data_sharing';

export interface PolicyConsent {
  id: string;
  user_id: string;
  policy_type: PolicyType;
  policy_version: string;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
}

export interface PolicyVersion {
  id: string;
  policy_type: PolicyType;
  current_version: string;
  effective_date: string;
  content_hash: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Security Incident Types
export type IncidentType = 
  | 'breach'
  | 'unauthorized_access'
  | 'data_leak'
  | 'account_takeover'
  | 'suspicious_activity'
  | 'policy_violation'
  | 'system_compromise'
  | 'other';

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type IncidentStatus = 
  | 'detected'
  | 'investigating'
  | 'contained'
  | 'resolved'
  | 'closed'
  | 'false_positive';

export interface SecurityIncident {
  id: string;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string | null;
  affected_users_count: number;
  affected_user_ids: string[];
  detected_at: string;
  detected_by: string | null;
  detection_method: string | null;
  contained_at: string | null;
  contained_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  root_cause: string | null;
  remediation_steps: string[] | null;
  users_notified: boolean;
  users_notified_at: string | null;
  notification_method: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SecurityIncidentTimeline {
  id: string;
  incident_id: string;
  action: string;
  actor_id: string | null;
  actor_role: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Failed Login Types
export interface FailedLoginAttempt {
  id: string;
  email: string | null;
  user_id: string | null;
  ip_address: string;
  user_agent: string | null;
  failure_reason: string | null;
  attempt_count: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

// PII Access Types
export type PIIDataType = 
  | 'full_name'
  | 'email'
  | 'phone'
  | 'address'
  | 'ssn'
  | 'dob'
  | 'id_document'
  | 'payment_method'
  | 'location'
  | 'ip_address'
  | 'device_id';

export interface PIIAccessLog {
  id: string;
  accessor_id: string;
  accessor_role: string;
  data_subject_id: string | null;
  data_type: PIIDataType;
  access_purpose: string;
  access_context: string | null;
  ip_address: string | null;
  accessed_at: string;
}

// Data Retention Types
export interface DataRetentionPolicy {
  id: string;
  entity_type: string;
  retention_days: number;
  anonymize_after_days: number | null;
  delete_after_days: number | null;
  legal_basis: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Compliance Export Types
export type ComplianceExportType = 
  | 'soc2'
  | 'financial_audit'
  | 'partner_compliance'
  | 'gdpr_dsar'
  | 'user_data_export'
  | 'incident_report';

export type ComplianceExportStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired';

export interface ComplianceExportRequest {
  id: string;
  export_type: ComplianceExportType;
  requested_by: string;
  status: ComplianceExportStatus;
  date_range_start: string | null;
  date_range_end: string | null;
  filters: Record<string, unknown>;
  file_url: string | null;
  file_size_bytes: number | null;
  expires_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// Audit Log (extended)
export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Security Stats
export interface SecurityStats {
  totalIncidents: number;
  openIncidents: number;
  criticalIncidents: number;
  failedLogins24h: number;
  piiAccessCount24h: number;
  pendingExports: number;
}
