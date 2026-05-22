/**
 * ChatContactPicker — Telegram-style "share a contact" picker.
 * Pick one contact from your saved list; the parent sends it as a contact card.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import UserSquare from "lucide-react/dist/esm/icons/user-square";
import { cn } from "@/lib/utils";

export interface SharedContact {
  userId: string;
  displayName: string;
  username?: string | null;
  avatarUrl?: string | null;
}

interface ContactProfileRow {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface UserContactRow {
  id: string;
  contact_user_id: string;
  custom_name: string | null;
  profiles: ContactProfileRow | ContactProfileRow[] | null;
}

function extractContactProfile(value: UserContactRow["profiles"]): ContactProfileRow | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the picked contact when the user taps "Share". */
  onConfirm: (contact: SharedContact) => void;
}

interface PickerContact {
  id: string;
  contact_user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function ChatContactPicker({ open, onOpenChange, onConfirm }: Props) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<PickerContact[]>([]);
  const [search, setSearch] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("user_contacts" as any)
        .select(`
          id, contact_user_id, custom_name,
          profiles:contact_user_id (full_name, username, avatar_url)
        `)
        .eq("user_id", user.id);
      if (cancelled) return;
      const rows = (data ?? []) as UserContactRow[];
      setContacts(
        rows.map((c) => {
          const profile = extractContactProfile(c.profiles);
          return {
            id: c.id,
            contact_user_id: c.contact_user_id,
            display_name: c.custom_name || profile?.full_name || null,
            username: profile?.username || null,
            avatar_url: profile?.avatar_url || null,
          };
        }),
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setPickedId(null);
    }
  }, [open]);

  const filtered = contacts.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.display_name?.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q);
  });

  const confirm = () => {
    const picked = contacts.find(c => c.contact_user_id === pickedId);
    if (!picked) return;
    onConfirm({
      userId: picked.contact_user_id,
      displayName: picked.display_name || "Unnamed",
      username: picked.username,
      avatarUrl: picked.avatar_url,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe h-[80vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left flex items-center gap-2">
            <UserSquare className="w-5 h-5 text-foreground" /> Share a contact
          </SheetTitle>
        </SheetHeader>
        <Input
          placeholder="Search contacts"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-3"
        />
        <div className="flex-1 overflow-y-auto mt-3 space-y-1">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-8 px-4">
              <UserSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground mb-1">
                {contacts.length === 0 ? "No contacts saved" : "No matches"}
              </p>
              <p className="text-xs text-muted-foreground">
                {contacts.length === 0 ? "Add contacts to share them in chat." : "Try a different search."}
              </p>
            </div>
          )}
          {filtered.map((c) => {
            const isPicked = pickedId === c.contact_user_id;
            return (
              <button type="button"
                key={c.id}
                onClick={() => setPickedId(isPicked ? null : c.contact_user_id)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
                  isPicked ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50"
                )}
              >
                <div className="w-9 h-9 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {c.avatar_url ? (
	                    <img
	                      src={c.avatar_url}
	                      alt=""
	                      className="w-full h-full object-cover"
	                      loading="lazy"
	                      decoding="async"
	                    />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">
                      {(c.display_name || "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium truncate">{c.display_name || "Unnamed"}</div>
                  {c.username && (
                    <div className="text-xs text-muted-foreground truncate">@{c.username}</div>
                  )}
                </div>
                {isPicked && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground shrink-0">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <Button onClick={confirm} disabled={!pickedId} className="mt-3">
          Share contact
        </Button>
      </SheetContent>
    </Sheet>
  );
}
