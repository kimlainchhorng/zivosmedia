/**
 * useContacts — Personal contacts (no phone required)
 * Add by @username, QR, or invite link.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Contact = {
  contact_user_id: string;
  custom_name: string | null;
  favorite: boolean;
  added_via: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    is_verified: boolean | null;
    last_seen: string | null;
  } | null;
};

export function useContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setContacts([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_contacts")
      .select("contact_user_id, custom_name, favorite, added_via, created_at")
      .eq("owner_id", user.id)
      .order("favorite", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data) { setContacts([]); setLoading(false); return; }

    let rows: Array<{
      contact_user_id: string;
      custom_name: string | null;
      favorite: boolean;
      added_via: string;
      created_at: string;
    }> = data as any;

    // Fallback: if the user has no explicit contacts yet, surface people they
    // have already chatted with so the page isn't empty.
    if (rows.length === 0) {
      const { data: dms } = await (supabase as any)
        .from("direct_messages")
        .select("sender_id, receiver_id, created_at")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(200);

      if (dms?.length) {
        const seen = new Map<string, string>(); // user_id -> created_at
        for (const m of dms as Array<{ sender_id: string; receiver_id: string; created_at: string }>) {
          const other = m.sender_id === user.id ? m.receiver_id : m.sender_id;
          if (!other || other === user.id) continue;
          if (!seen.has(other)) seen.set(other, m.created_at);
        }
        rows = Array.from(seen.entries()).map(([uid, ts]) => ({
          contact_user_id: uid,
          custom_name: null,
          favorite: false,
          added_via: "chat_history",
          created_at: ts,
        }));
      }
    }

    const ids = rows.map((r) => r.contact_user_id);
    const profiles: Record<string, Contact["profile"]> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, username, is_verified, last_seen")
        .in("user_id", ids);
      profs?.forEach((p: any) => { profiles[p.user_id] = p; });
    }

    setContacts(rows.map((r) => ({ ...r, profile: profiles[r.contact_user_id] ?? null })));
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const findByUsername = useCallback(async (username: string) => {
    const clean = username.trim().replace(/^@/, "");
    if (!clean) return { user: null, error: "Enter a username" };
    const { data: row } = await supabase
      .from("usernames")
      .select("user_id")
      .ilike("username", clean)
      .maybeSingle();
    if (!row?.user_id) return { user: null, error: "User not found" };
    const { data: prof } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, username, is_verified")
      .eq("user_id", row.user_id)
      .maybeSingle();
    return { user: prof, error: null as string | null };
  }, []);

  const add = useCallback(async (
    contactUserId: string,
    opts?: { customName?: string; via?: Contact["added_via"] }
  ) => {
    if (!user) return { ok: false, error: "Not signed in" };
    if (contactUserId === user.id) return { ok: false, error: "You can't add yourself" };
    const { error } = await supabase.from("user_contacts").upsert({
      owner_id: user.id,
      contact_user_id: contactUserId,
      custom_name: opts?.customName ?? null,
      added_via: opts?.via ?? "username",
    });
    if (error) return { ok: false, error: error.message };
    await refresh();
    return { ok: true };
  }, [user, refresh]);

  const remove = useCallback(async (contactUserId: string) => {
    if (!user) return;
    await supabase
      .from("user_contacts")
      .delete()
      .eq("owner_id", user.id)
      .eq("contact_user_id", contactUserId);
    await refresh();
  }, [user, refresh]);

  const toggleFavorite = useCallback(async (contactUserId: string, favorite: boolean) => {
    if (!user) return;
    await supabase
      .from("user_contacts")
      .update({ favorite })
      .eq("owner_id", user.id)
      .eq("contact_user_id", contactUserId);
    await refresh();
  }, [user, refresh]);

  const rename = useCallback(async (contactUserId: string, customName: string | null) => {
    if (!user) return;
    await supabase
      .from("user_contacts")
      .update({ custom_name: customName })
      .eq("owner_id", user.id)
      .eq("contact_user_id", contactUserId);
    await refresh();
  }, [user, refresh]);

  return { contacts, loading, refresh, findByUsername, add, remove, toggleFavorite, rename };
}
