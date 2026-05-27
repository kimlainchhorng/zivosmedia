/**
 * Saved Traveler Types for ZIVO Travel Platform
 */

export type TravelerType = 'adult' | 'child' | 'infant';
export type Gender = 'male' | 'female' | 'other';

export interface SavedTraveler {
  id: string;
  user_id: string;
  traveler_type: TravelerType;
  title: string | null;
  given_name: string;
  family_name: string;
  born_on: string | null;
  gender: Gender | null;
  email: string | null;
  phone_number: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  passport_country: string | null;
  nationality: string | null;
  known_traveler_number: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSavedTravelerInput {
  traveler_type?: TravelerType;
  title?: string;
  given_name: string;
  family_name: string;
  born_on?: string;
  gender?: Gender;
  email?: string;
  phone_number?: string;
  passport_number?: string;
  passport_expiry?: string;
  passport_country?: string;
  nationality?: string;
  known_traveler_number?: string;
  is_primary?: boolean;
}

export interface UpdateSavedTravelerInput extends Partial<CreateSavedTravelerInput> {
  id: string;
}

export interface UserEmailPreferences {
  id: string;
  user_id: string;
  marketing_emails: boolean;
  price_alerts: boolean;
  booking_updates: boolean;
  newsletter: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateEmailPreferencesInput {
  marketing_emails?: boolean;
  price_alerts?: boolean;
  booking_updates?: boolean;
  newsletter?: boolean;
}
