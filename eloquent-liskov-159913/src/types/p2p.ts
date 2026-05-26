/**
 * P2P Car Rental Marketplace Types
 * TypeScript types for the peer-to-peer car rental system
 */

import type { Database } from "@/integrations/supabase/types";

// Extract types from generated Supabase types
export type CarOwnerProfile = Database["public"]["Tables"]["car_owner_profiles"]["Row"] & {
  admin_review_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
};
export type CarOwnerProfileInsert = Database["public"]["Tables"]["car_owner_profiles"]["Insert"];
export type CarOwnerProfileUpdate = Database["public"]["Tables"]["car_owner_profiles"]["Update"];

export type CarOwnerDocument = Database["public"]["Tables"]["car_owner_documents"]["Row"];
export type CarOwnerDocumentInsert = Database["public"]["Tables"]["car_owner_documents"]["Insert"];

export type P2PVehicle = Database["public"]["Tables"]["p2p_vehicles"]["Row"];
export type P2PVehicleInsert = Database["public"]["Tables"]["p2p_vehicles"]["Insert"];
export type P2PVehicleUpdate = Database["public"]["Tables"]["p2p_vehicles"]["Update"];

export type P2PBooking = Database["public"]["Tables"]["p2p_bookings"]["Row"];
export type P2PReview = Database["public"]["Tables"]["p2p_reviews"]["Row"];
export type P2PPayout = Database["public"]["Tables"]["p2p_payouts"]["Row"];
export type P2PDispute = Database["public"]["Tables"]["p2p_disputes"]["Row"];
export type P2PCommissionSettings = Database["public"]["Tables"]["p2p_commission_settings"]["Row"];

// Enum types
export type CarOwnerStatus = Database["public"]["Enums"]["car_owner_status"];
export type CarOwnerDocumentType = Database["public"]["Enums"]["car_owner_document_type"];
export type CarOwnerInsuranceOption = Database["public"]["Enums"]["car_owner_insurance_option"];
export type DocumentReviewStatus = Database["public"]["Enums"]["document_review_status"];
export type P2PVehicleStatus = Database["public"]["Enums"]["p2p_vehicle_status"];
export type P2PVehicleCategory = Database["public"]["Enums"]["p2p_vehicle_category"];
export type P2PTransmission = Database["public"]["Enums"]["p2p_transmission_type"];
export type P2PFuelType = Database["public"]["Enums"]["p2p_fuel_type"];
export type P2PBookingStatus = Database["public"]["Enums"]["p2p_booking_status"];
export type P2PPaymentStatus = Database["public"]["Enums"]["p2p_payment_status"];
export type P2PPayoutStatus = Database["public"]["Enums"]["p2p_payout_status"];
export type P2PDisputeStatus = Database["public"]["Enums"]["p2p_dispute_status"];
export type P2PDisputeType = Database["public"]["Enums"]["p2p_dispute_type"];
export type P2PReviewType = Database["public"]["Enums"]["p2p_review_type"];

// Owner Application Form Data
export interface OwnerApplicationFormData {
  // Step 1: Personal Information
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  
  // Step 2: Verification
  ssn_last_four: string;
  insurance_option: CarOwnerInsuranceOption;
}

// Document upload types
export interface DocumentUpload {
  type: CarOwnerDocumentType;
  file: File;
  preview?: string;
}

// Owner stats for dashboard
export interface OwnerStats {
  totalVehicles: number;
  activeBookings: number;
  totalTrips: number;
  totalEarnings: number;
  pendingPayouts: number;
  averageRating: number | null;
}

// Admin owner list item
export interface AdminOwnerListItem extends CarOwnerProfile {
  documentsCount: number;
  approvedDocumentsCount: number;
}

// Vehicle with owner info
export interface VehicleWithOwner extends P2PVehicle {
  owner?: CarOwnerProfile;
}

// Booking with partial vehicle/owner for list views
export interface BookingWithDetails extends P2PBooking {
  vehicle?: Partial<P2PVehicle> & {
    id: string;
    make: string;
    model: string;
    year: number;
    images?: unknown;
    location_city?: string;
    location_state?: string;
    location_address?: string;
    seats?: number;
    transmission?: string;
    fuel_type?: string;
  };
  owner?: Partial<CarOwnerProfile> & {
    id: string;
    full_name: string;
    phone?: string;
    email?: string;
    rating?: number | null;
  };
}
