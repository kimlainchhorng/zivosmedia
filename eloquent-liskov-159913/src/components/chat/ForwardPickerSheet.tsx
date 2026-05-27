/**
 * ForwardPickerSheet — Choose contacts to forward a message to
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Forward from "lucide-react/dist/esm/icons/forward";

interface Contact {
  id: string;
  contact_user_id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
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
  /** Called with selected recipients and an optional Telegram-style comment to send before the forwarded message. */
  onConfirm: (recipientIds: string[], comment?: string) => void;
}

export default function ForwardPickerSheet({ open, onOpenChange, onConfirm }: Props) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("user_contacts" as any)
        .select(`
          id, contact_user_id, custom_name,
          profiles:contact_user_id (full_name, username, avatar_url)
        `)
        .eq("user_id", user.id);

      const rows = (data ?? []) as UserContactRow[];
      setContacts(
        rows.map((c) => {
          const profile = extractContactProfile(c.profiles);
          return {
          id: c.id,
          contact_user_id: c.contact_user_id,
          display_name: c.custom_name || profile?.full_name,
          username: profile?.username,
          avatar_url: profile?.avatar_url,
        };
        }),
      );
    })();
  }, [open, user]);

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.display_name?.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q);
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = () => {
    if (selected.size === 0) return;
    onConfirm(Array.from(selected), comment.trim() || undefined);
    setSelected(new Set());
    setComment("");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe h-[80vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left flex items-center gap-2">
            <Forward className="w-5 h-5" /> Forward to…
          </SheetTitle>
        </SheetHeader>
        <Input
          placeholder="Search contacts"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-3"
        />
        <div className="flex-1 overflow-y-auto mt-3 space-y-1">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No contacts found</p>
          )}
          {filtered.map((c) => (
            <button type="button"
              key={c.id}
              onClick={() => toggle(c.contact_user_id)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
            >
              <Checkbox checked={selected.has(c.contact_user_id)} />
              <div className="w-9 h-9 rounded-full bg-muted overflow-hidden shrink-0">
	                {c.avatar_url && (
	                  <img
	                    src={c.avatar_url}
	                    alt=""
	                    className="w-full h-full object-cover"
	                    loading="lazy"
	                    decoding="async"
	                  />
	                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium truncate">{c.display_name || "Unnamed"}</div>
                {c.username && <div className="text-xs text-muted-foreground truncate">@{c.username}</div>}
              </div>
            </button>
          ))}
        </div>
        {selected.size > 0 && (
          <Input
            placeholder="Add a comment (optional)…"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            className="mt-3"
            maxLength={500}
          />
        )}
        <Button onClick={confirm} disabled={selected.size === 0} className="mt-3">
          Forward {selected.size > 0 && `(${selected.size})`}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
