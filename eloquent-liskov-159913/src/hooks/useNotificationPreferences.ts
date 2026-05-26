/**
 * useNotificationPreferences Hook
 * Manages user notification preferences for push, SMS, and email channels
 * Including quiet hours, consent tracking, and opt-out re-enable
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { normalizePhoneE164 } from "@/lib/phone";

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  marketingEnabled: boolean;
  operationalEnabled: boolean;
  phoneNumber: string | null;
  phoneVerified: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  smsConsentAt: string | null;
  automatedMessagesEnabled: boolean;
  automatedCartReminders: boolean;
  automatedReengagement: boolean;
  automatedBirthday: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RawNotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  marketing_enabled: boolean;
  operational_enabled: boolean;
  phone_number: string | null;
  phone_verified: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  sms_consent_at: string | null;
  automated_messages_enabled: boolean;
  automated_cart_reminders: boolean;
  automated_reengagement: boolean;
  automated_birthday: boolean;
  created_at: string;
  updated_at: string;
}

function mapToPreferences(raw: RawNotificationPreferences): NotificationPreferences {
  return {
    id: raw.id,
    userId: raw.user_id,
    emailEnabled: raw.email_enabled,
    smsEnabled: raw.sms_enabled,
    inAppEnabled: raw.in_app_enabled,
    marketingEnabled: raw.marketing_enabled,
    operationalEnabled: raw.operational_enabled,
    phoneNumber: raw.phone_number,
    phoneVerified: raw.phone_verified,
    quietHoursEnabled: raw.quiet_hours_enabled ?? false,
    quietHoursStart: raw.quiet_hours_start,
    quietHoursEnd: raw.quiet_hours_end,
    smsConsentAt: raw.sms_consent_at,
    automatedMessagesEnabled: raw.automated_messages_enabled ?? true,
    automatedCartReminders: raw.automated_cart_reminders ?? true,
    automatedReengagement: raw.automated_reengagement ?? true,
    automatedBirthday: raw.automated_birthday ?? true,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async (): Promise<NotificationPreferences | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching notification preferences:", error);
        throw error;
      }

      if (!data) return null;
      return mapToPreferences(data as RawNotificationPreferences);
    },
    enabled: !!user?.id,
  });
}

export interface UpdatePreferencesInput {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  inAppEnabled?: boolean;
  marketingEnabled?: boolean;
  operationalEnabled?: boolean;
  phoneNumber?: string | null;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  smsConsentAt?: string;
  smsConsentText?: string;
  automatedMessagesEnabled?: boolean;
  automatedCartReminders?: boolean;
  automatedReengagement?: boolean;
  automatedBirthday?: boolean;
}

export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: UpdatePreferencesInput): Promise<NotificationPreferences> => {
      if (!user?.id) throw new Error("Not authenticated");

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.emailEnabled !== undefined) updateData.email_enabled = updates.emailEnabled;
      if (updates.smsEnabled !== undefined) updateData.sms_enabled = updates.smsEnabled;
      if (updates.inAppEnabled !== undefined) updateData.in_app_enabled = updates.inAppEnabled;
      if (updates.marketingEnabled !== undefined) updateData.marketing_enabled = updates.marketingEnabled;
      if (updates.operationalEnabled !== undefined) updateData.operational_enabled = updates.operationalEnabled;
      if (updates.phoneNumber !== undefined) updateData.phone_number = updates.phoneNumber;
      if (updates.quietHoursEnabled !== undefined) updateData.quiet_hours_enabled = updates.quietHoursEnabled;
      if (updates.quietHoursStart !== undefined) updateData.quiet_hours_start = updates.quietHoursStart;
      if (updates.quietHoursEnd !== undefined) updateData.quiet_hours_end = updates.quietHoursEnd;
      if (updates.smsConsentAt !== undefined) updateData.sms_consent_at = updates.smsConsentAt;
      if (updates.smsConsentText !== undefined) updateData.sms_consent_text = updates.smsConsentText;
      if (updates.automatedMessagesEnabled !== undefined) updateData.automated_messages_enabled = updates.automatedMessagesEnabled;
      if (updates.automatedCartReminders !== undefined) updateData.automated_cart_reminders = updates.automatedCartReminders;
      if (updates.automatedReengagement !== undefined) updateData.automated_reengagement = updates.automatedReengagement;
      if (updates.automatedBirthday !== undefined) updateData.automated_birthday = updates.automatedBirthday;

      // Check if preferences exist
      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let result;

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("notification_preferences")
          .update(updateData as any)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new with defaults
        const { data, error } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            email_enabled: updates.emailEnabled ?? true,
            sms_enabled: updates.smsEnabled ?? false,
            in_app_enabled: updates.inAppEnabled ?? true,
            marketing_enabled: updates.marketingEnabled ?? false,
            operational_enabled: updates.operationalEnabled ?? true,
            phone_number: updates.phoneNumber ?? null,
            phone_verified: false,
            quiet_hours_enabled: updates.quietHoursEnabled ?? false,
            quiet_hours_start: updates.quietHoursStart ?? "22:00",
            quiet_hours_end: updates.quietHoursEnd ?? "08:00",
            sms_consent_at: updates.smsConsentAt ?? null,
            sms_consent_text: updates.smsConsentText ?? null,
          } as any)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      // Also sync sms_consent to profiles
      if (updates.smsEnabled !== undefined || updates.smsConsentAt !== undefined) {
        await supabase
          .from("profiles")
          .update({ 
            sms_consent: updates.smsEnabled ?? true,
          })
          .eq("user_id", user.id);
      }

      return mapToPreferences(result as RawNotificationPreferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update preferences: ${error.message}`);
    },
  });
}

export function useSendPhoneOTP() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (phoneE164: string): Promise<{ success: boolean; message: string }> => {
      if (!user?.id) throw new Error("Not authenticated");

      const normalizedPhone = normalizePhoneE164(phoneE164);
      if (!normalizedPhone) throw new Error("Phone number is required");

      const { data, error } = await supabase.functions.invoke("send-otp-sms", {
        body: { phone_e164: normalizedPhone, user_id: user.id },
      });

      // supabase-js wraps non-2xx responses but the actual JSON body is in
      // error.context. Surface its `error` field so users see the real reason
      // (e.g. Twilio "Unverified caller ID", "Geo permission denied").
      if (error) {
        let real = error.message;
        try {
          const ctx = (error as any)?.context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) real = body.error;
          } else if (ctx?.body) {
            const body = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
            if (body?.error) real = body.error;
          }
        } catch {}
        console.error("[useSendPhoneOTP] real error:", real, error);
        throw new Error(real);
      }
      if (!data?.success) throw new Error(data?.error || "Failed to send OTP");

      return { success: true, message: data.message || "OTP sent successfully" };
    },
    onSuccess: () => {
      toast.success("Verification code sent to your phone");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useVerifyPhoneOTP() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phoneE164,
      code,
    }: {
      phoneE164: string;
      code: string;
    }): Promise<{ success: boolean }> => {
      if (!user?.id) throw new Error("Not authenticated");

      const normalizedPhone = normalizePhoneE164(phoneE164);
      if (!normalizedPhone) throw new Error("Phone number is required");

      const { data, error } = await supabase.functions.invoke("verify-otp-sms", {
        body: { phone_e164: normalizedPhone, code, user_id: user.id },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Invalid code");

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Phone number verified successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Re-enable SMS after user has opted out
 * Clears the opt-out flag and re-enables SMS notifications
 */
export function useReenableSMS() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean }> => {
      if (!user?.id) throw new Error("Not authenticated");

      // Clear opt-out flag on profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          sms_opted_out: false,
          sms_opted_out_at: null,
          sms_consent: true,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Re-enable SMS in preferences
      const { error: prefsError } = await supabase
        .from("notification_preferences")
        .update({ 
          sms_enabled: true,
          sms_consent_at: new Date().toISOString(),
        } as any)
        .eq("user_id", user.id);

      if (prefsError) throw prefsError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("SMS notifications re-enabled");
    },
    onError: (error: Error) => {
      toast.error(`Failed to re-enable SMS: ${error.message}`);
    },
  });
}

export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("phone, phone_e164, phone_verified, email, sms_consent, sms_opted_out, sms_opted_out_at")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}
