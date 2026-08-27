/**
 * useAllowMessageRequests — read and update the signed-in user's
 * non-contact chat-alert preference.
 *
 * Backed by the existing `privacy_settings.allow_message_requests` column
 * (already toggled from PrivacySettingsPage). This hook just exposes it
 * to other surfaces (message requests, notification bell and notification
 * center). A successful no-row read uses the documented default (`true`),
 * while loading and failed reads stay unconfirmed (`null`).
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type PreferenceMutation = {
  ownerId: string;
  ownerRevision: number;
  mutationId: number;
};

const isConfirmedFunctionResult = (value: unknown, ownerId: string): boolean =>
  typeof value === "object" &&
  value !== null &&
  "ok" in value &&
  value.ok === true &&
  "user_id" in value &&
  value.user_id === ownerId;

export function shouldHideMessageRequestNotification(
  threadId: string | null,
  allow: boolean | null,
  contactSet: ReadonlySet<string> | undefined,
): boolean {
  if (!threadId || allow === true) return false;
  if (!contactSet) return true;
  return !contactSet.has(threadId);
}

export function useAllowMessageRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ownerStateRef = useRef({ ownerId: user?.id, revision: 0 });
  const mutationIdRef = useRef(0);
  const mutationRef = useRef<PreferenceMutation | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Update the owner epoch during render so a late promise cannot land in the
  // small render-to-effect window after Auth has already switched accounts.
  // This security fence intentionally precedes effects; it is transient state
  // used only by async handlers and never supplies rendered UI values.
  /* eslint-disable react-hooks/refs -- synchronous owner epoch security fence */
  if (ownerStateRef.current.ownerId !== user?.id) {
    ownerStateRef.current = {
      ownerId: user?.id,
      revision: ownerStateRef.current.revision + 1,
    };
    mutationRef.current = null;
  }
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    setIsUpdating(false);
  }, [user?.id]);

  const preferenceQuery = useQuery({
    queryKey: ["privacy-settings", user?.id, "allow_message_requests"],
    enabled: !!user?.id,
    queryFn: async () => {
      const ownerId = user?.id;
      if (!ownerId) throw new Error("Not signed in");

      const { data, error } = await (supabase as any)
        .from("privacy_settings")
        .select("allow_message_requests")
        .eq("user_id", ownerId)
        .maybeSingle();
      if (error) throw error;

      const v = (data as { allow_message_requests: boolean | null } | null)
        ?.allow_message_requests;
      return v === null || v === undefined ? true : v;
    },
  });

  const setValue = useCallback(
    async (next: boolean): Promise<boolean> => {
      const ownerId = user?.id;
      if (!ownerId) throw new Error("Not signed in");
      if (mutationRef.current?.ownerId === ownerId) return false;

      const token = {
        ownerId,
        ownerRevision: ownerStateRef.current.revision,
        mutationId: ++mutationIdRef.current,
      };
      mutationRef.current = token;
      setIsUpdating(true);

      const isCurrentMutation = () =>
        ownerStateRef.current.ownerId === ownerId &&
        ownerStateRef.current.revision === token.ownerRevision &&
        mutationRef.current === token;

      try {
        const { data: activeAuth, error: authError } =
          await supabase.auth.getUser();
        if (authError || activeAuth.user?.id !== ownerId) {
          throw new Error(
            "Your account changed. Review this preference and try again.",
          );
        }

        const { data, error } =
          await supabase.functions.invoke("privacy-settings-update", {
            body: {
              key: "allow_message_requests",
              value: next,
            },
          });
        if (error) throw error;
        if (!isConfirmedFunctionResult(data, ownerId)) {
          throw new Error("Privacy update was not confirmed");
        }
        if (!isCurrentMutation()) return false;

        queryClient.setQueryData(
          ["privacy-settings", ownerId, "allow_message_requests"],
          next,
        );

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["privacy-settings", ownerId],
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: ["privacy-settings", ownerId, "allow_message_requests"],
            exact: true,
          }),
        ]);

        return isCurrentMutation();
      } finally {
        if (isCurrentMutation()) {
          mutationRef.current = null;
          setIsUpdating(false);
        }
      }
    },
    [queryClient, user?.id],
  );

  return {
    allow: preferenceQuery.isError ? null : (preferenceQuery.data ?? null),
    isLoading: !!user?.id && preferenceQuery.isPending,
    isFetching: preferenceQuery.isFetching,
    isError: preferenceQuery.isError,
    error: preferenceQuery.error,
    refetch: preferenceQuery.refetch,
    isUpdating,
    setValue,
  };
}

export function useMessageRequestNotificationPrivacy() {
  const { user } = useAuth();
  const preference = useAllowMessageRequests();
  const contactsRequired = !!user?.id && preference.allow !== true;

  const contactQuery = useQuery({
    queryKey: ["message-request-contact-set", user?.id],
    enabled: contactsRequired,
    queryFn: async () => {
      const ownerId = user?.id;
      if (!ownerId) throw new Error("Not signed in");

      const { data, error } = await (supabase as any)
        .from("user_contacts")
        .select("contact_user_id")
        .eq("owner_id", ownerId);
      if (error) throw error;
      return new Set<string>(
        ((data || []) as { contact_user_id: string }[]).map(
          (contact) => contact.contact_user_id,
        ),
      );
    },
  });

  const shouldHideNotification = useCallback(
    (threadId: string | null) =>
      shouldHideMessageRequestNotification(
        threadId,
        preference.allow,
        contactQuery.isError || contactQuery.isFetching
          ? undefined
          : contactQuery.data,
      ),
    [
      contactQuery.data,
      contactQuery.isError,
      contactQuery.isFetching,
      preference.allow,
    ],
  );

  const refetchPreference = preference.refetch;
  const refetchContacts = contactQuery.refetch;
  const retry = useCallback(async () => {
    const retries: Promise<unknown>[] = [refetchPreference()];
    if (contactsRequired) retries.push(refetchContacts());
    await Promise.all(retries);
  }, [contactsRequired, refetchContacts, refetchPreference]);

  return {
    allow: preference.allow,
    shouldHideNotification,
    isPrivacyLoading:
      !!user?.id &&
      (preference.isLoading || (contactsRequired && contactQuery.isFetching)),
    isPrivacyUnavailable:
      preference.isError || (contactsRequired && contactQuery.isError),
    isPrivacyFetching:
      preference.isFetching || (contactsRequired && contactQuery.isFetching),
    retry,
  };
}
