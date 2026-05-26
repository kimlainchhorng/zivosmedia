/**
 * useContactRequests — incoming/outgoing contact requests with realtime updates.
 * Handles duplicate-key (23505) gracefully and resolves reciprocal requests on accept.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ContactRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export type SendResult = { ok: true; duplicate?: boolean } | { ok: false; error: string };

export function useContactRequests() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<ContactRequest[]>([]);
  const [outgoing, setOutgoing] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setIncoming([]); setOutgoing([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("contact_requests")
      .select("*")
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    const rows: ContactRequest[] = (data ?? []) as any;
    const ids = Array.from(new Set(rows.map((r) => (r.from_user_id === user.id ? r.to_user_id : r.from_user_id))));
    const profiles: Record<string, ContactRequest["profile"]> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", ids);
      profs?.forEach((p: any) => { profiles[p.user_id] = p; });
    }
    const decorate = (r: ContactRequest): ContactRequest => ({
      ...r,
      profile: profiles[r.from_user_id === user.id ? r.to_user_id : r.from_user_id] ?? null,
    });
    setIncoming(rows.filter((r) => r.to_user_id === user.id && r.status === "pending").map(decorate));
    setOutgoing(rows.filter((r) => r.from_user_id === user.id).map(decorate));
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`contact-requests-${user.id}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_requests" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  const send = useCallback(async (toUserId: string, message?: string): Promise<SendResult> => {
    if (!user) return { ok: false, error: "Not signed in" };
    if (toUserId === user.id) return { ok: false, error: "You can't add yourself" };
    const { error } = await (supabase as any).from("contact_requests").insert({
      from_user_id: user.id,
      to_user_id: toUserId,
      message: message ?? null,
      status: "pending",
    });
    if (error) {
      const code = (error as any).code;
      const msg = (error.message || "").toLowerCase();
      if (code === "23505" || msg.includes("duplicate") || msg.includes("already exists")) {
        await refresh();
        return { ok: true, duplicate: true };
      }
      return { ok: false, error: error.message };
    }
    await refresh();
    return { ok: true };
  }, [user, refresh]);

  const accept = useCallback(async (id: string) => {
    if (!user) return;
    const req = incoming.find((r) => r.id === id);
    const { error } = await (supabase as any)
      .from("contact_requests")
      .update({ status: "accepted" })
      .eq("id", id);
    if (error) return;
    if (req) {
      // Reciprocal contact entries
      await supabase.from("user_contacts").upsert([
        { owner_id: user.id, contact_user_id: req.from_user_id, added_via: "request" },
        { owner_id: req.from_user_id, contact_user_id: user.id, added_via: "request" },
      ]);
      // Auto-resolve any matching outgoing request from me to the same user
      await (supabase as any)
        .from("contact_requests")
        .update({ status: "accepted" })
        .eq("from_user_id", user.id)
        .eq("to_user_id", req.from_user_id)
        .eq("status", "pending");
    }
    await refresh();
  }, [user, incoming, refresh]);

  const decline = useCallback(async (id: string) => {
    await (supabase as any).from("contact_requests").update({ status: "declined" }).eq("id", id);
    await refresh();
  }, [refresh]);

  const cancel = useCallback(async (id: string) => {
    await (supabase as any).from("contact_requests").delete().eq("id", id);
    await refresh();
  }, [refresh]);

  const resend = useCallback(async (id: string): Promise<SendResult> => {
    const r = outgoing.find((x) => x.id === id);
    if (!r) return { ok: false, error: "Request not found" };
    await (supabase as any).from("contact_requests").delete().eq("id", id);
    return send(r.to_user_id, r.message ?? undefined);
  }, [outgoing, send]);

  return { incoming, outgoing, loading, refresh, send, accept, decline, cancel, resend };
}
