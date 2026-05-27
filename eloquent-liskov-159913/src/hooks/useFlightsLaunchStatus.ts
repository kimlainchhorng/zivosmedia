/**
 * Flights Launch Status Hooks
 * 3-phase launch system: Internal Test → Private Beta → Public Live
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { 
  FlightsLaunchSettings, 
  FlightsLaunchChecklist,
  FlightsLaunchPhase,
} from "@/types/flightsLaunch";

/**
 * Fetch current flights launch settings
 */
export function useFlightsLaunchSettings() {
  return useQuery({
    queryKey: ["flights-launch-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flights_launch_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      return data as unknown as FlightsLaunchSettings;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Check if user has beta access (for private_beta phase)
 */
export function useFlightsBetaAccess() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["flights-beta-access", user?.email],
    queryFn: async () => {
      if (!user?.email) return { hasBetaAccess: false };
      
      const { data, error } = await supabase
        .from("flight_beta_invites")
        .select("*")
        .eq("email", user.email)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return { hasBetaAccess: !!data, invite: data };
    },
    enabled: !!user?.email,
  });
}

/**
 * Check if current user can book flights based on launch phase
 * - internal_test: Admins only
 * - private_beta: Admins + invited beta users
 * - public_live: Everyone (unless paused)
 */
export function useFlightsCanBook() {
  const { data: settings, isLoading } = useFlightsLaunchSettings();
  const { data: betaAccess } = useFlightsBetaAccess();
  const { isAdmin, user } = useAuth();

  const phase = settings?.launch_phase || 'internal_test';
  const isPaused = settings?.emergency_pause === true;
  
  let canBook = false;
  let reason = '';
  
  if (isPaused) {
    canBook = false;
    reason = settings?.emergency_pause_reason || 'Bookings are temporarily paused';
  } else if (phase === 'internal_test') {
    canBook = isAdmin;
    reason = isAdmin ? '' : 'Flight booking is in internal testing mode';
  } else if (phase === 'private_beta') {
    canBook = isAdmin || betaAccess?.hasBetaAccess === true;
    reason = canBook ? '' : 'Flight booking is in private beta. Request an invite to participate.';
  } else if (phase === 'public_live') {
    canBook = true;
    reason = '';
  }

  return {
    canBook,
    reason,
    phase,
    isInternalTest: phase === 'internal_test',
    isPrivateBeta: phase === 'private_beta',
    isPublicLive: phase === 'public_live',
    isPaused,
    pauseReason: settings?.emergency_pause_reason,
    isLoading,
    settings,
    hasBetaAccess: betaAccess?.hasBetaAccess,
  };
}

/**
 * Update a checklist item
 */
export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      settingsId, 
      key, 
      value 
    }: { 
      settingsId: string; 
      key: keyof FlightsLaunchChecklist; 
      value: boolean;
    }) => {
      const { error } = await supabase
        .from("flights_launch_settings")
        .update({
          [key]: value,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", settingsId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flights-launch-settings"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update checklist");
    },
  });
}

/**
 * Update launch phase
 */
export function useUpdateLaunchPhase() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ settingsId, phase }: { settingsId: string; phase: FlightsLaunchPhase }) => {
      const updates: Record<string, any> = {
        launch_phase: phase,
        status: phase === 'public_live' ? 'live' : 'test',
        status_changed_at: new Date().toISOString(),
        status_changed_by: user?.id,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from("flights_launch_settings")
        .update(updates as any)
        .eq("id", settingsId);

      if (error) throw error;
    },
    onSuccess: (_, { phase }) => {
      queryClient.invalidateQueries({ queryKey: ["flights-launch-settings"] });
      const messages: Record<FlightsLaunchPhase, string> = {
        internal_test: "Switched to Internal Test mode",
        private_beta: "Switched to Private Beta mode",
        public_live: "ZIVO Flights is now PUBLIC LIVE!",
      };
      toast.success(messages[phase]);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update launch phase");
    },
  });
}

/**
 * Toggle launch announcement
 */
export function useUpdateLaunchAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      settingsId, 
      enabled, 
      text 
    }: { 
      settingsId: string; 
      enabled: boolean; 
      text?: string;
    }) => {
      const { error } = await supabase
        .from("flights_launch_settings")
        .update({
          launch_announcement_enabled: enabled,
          launch_announcement_text: text,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settingsId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flights-launch-settings"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update announcement");
    },
  });
}

/**
 * Go LIVE - switch from TEST to LIVE mode (legacy, uses new phase system)
 */
export function useGoLive() {
  const updatePhase = useUpdateLaunchPhase();
  
  return {
    ...updatePhase,
    mutateAsync: async (settingsId: string) => {
      return updatePhase.mutateAsync({ settingsId, phase: 'public_live' });
    },
  };
}

/**
 * Toggle emergency pause
 */
export function useEmergencyPause() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      settingsId, 
      pause, 
      reason 
    }: { 
      settingsId: string; 
      pause: boolean; 
      reason?: string;
    }) => {
      const { error } = await supabase
        .from("flights_launch_settings")
        .update({
          emergency_pause: pause,
          emergency_pause_reason: pause ? reason : null,
          emergency_pause_at: pause ? new Date().toISOString() : null,
          emergency_pause_by: pause ? user?.id : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settingsId);

      if (error) throw error;
    },
    onSuccess: (_, { pause }) => {
      queryClient.invalidateQueries({ queryKey: ["flights-launch-settings"] });
      toast[pause ? 'warning' : 'success'](
        pause ? "Flight bookings paused" : "Flight bookings resumed"
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update pause status");
    },
  });
}

/**
 * Validate pre-launch checklist for each phase
 * Returns ready state and list of blockers
 */
export function validateLaunchChecklist(
  settings: FlightsLaunchSettings | undefined,
  targetPhase: FlightsLaunchPhase = 'public_live'
): {
  ready: boolean;
  checklist: { item: string; key: keyof FlightsLaunchChecklist; done: boolean; requiredFor: FlightsLaunchPhase[] }[];
  blockers: string[];
} {
  if (!settings) {
    return { ready: false, checklist: [], blockers: ['Settings not loaded'] };
  }

  const checklist: { item: string; key: keyof FlightsLaunchChecklist; done: boolean; requiredFor: FlightsLaunchPhase[] }[] = [
    { item: 'Seller of Travel page verified', key: 'seller_of_travel_verified', done: settings.seller_of_travel_verified, requiredFor: ['private_beta', 'public_live'] },
    { item: 'Terms & Privacy linked', key: 'terms_privacy_linked', done: settings.terms_privacy_linked, requiredFor: ['private_beta', 'public_live'] },
    { item: 'Support email configured', key: 'support_email_configured', done: settings.support_email_configured, requiredFor: ['private_beta', 'public_live'] },
    { item: 'Stripe LIVE enabled', key: 'stripe_live_enabled', done: settings.stripe_live_enabled, requiredFor: ['private_beta', 'public_live'] },
    { item: 'Duffel LIVE configured', key: 'duffel_live_configured', done: settings.duffel_live_configured, requiredFor: ['private_beta', 'public_live'] },
    { item: 'Refund flow tested', key: 'refund_flow_tested', done: settings.refund_flow_tested ?? false, requiredFor: ['public_live'] },
  ];

  // Filter blockers based on target phase
  const requiredItems = checklist.filter(c => c.requiredFor.includes(targetPhase));
  const blockers = requiredItems.filter(c => !c.done).map(c => c.item);

  return {
    ready: blockers.length === 0,
    checklist,
    blockers,
  };
}

/**
 * Manage beta invites
 */
export function useFlightsBetaInvites() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: invites = [], isLoading, refetch } = useQuery({
    queryKey: ["flights-beta-invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_beta_invites")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createInvite = useMutation({
    mutationFn: async (email: string) => {
      const inviteCode = `ZIVO-BETA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from("flight_beta_invites")
        .insert({
          email,
          invite_code: inviteCode,
          invited_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flights-beta-invites"] });
      toast.success("Beta invite created!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create invite");
    },
  });

  const revokeInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("flight_beta_invites")
        .update({ is_active: false })
        .eq("id", inviteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flights-beta-invites"] });
      toast.success("Invite revoked");
    },
  });

  return {
    invites,
    isLoading,
    refetch,
    createInvite,
    revokeInvite,
  };
}
