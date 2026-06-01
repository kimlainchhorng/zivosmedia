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
      <SheetContent side="bottom" className="zivo-chat-popover-glass flex h-[80vh] flex-col rounded-t-[1.75rem] border-white/10 px-0 pb-safe shadow-2xl">
        <div className="zivo-chat-header-glass px-5 pb-4 pt-5">
          <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-foreground/20" />
          <SheetHeader>
            <p className="text-left text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Message route</p>
          <SheetTitle className="flex items-center gap-2 text-left text-lg font-black">
            <Forward className="h-5 w-5 text-primary" /> Forward to…
          </SheetTitle>
        </SheetHeader>
        </div>
        <div className="px-4 pt-3">
        <Input
          placeholder="Search contacts"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="zivo-chat-search h-11"
        />
        </div>
        <div className="mt-3 flex-1 space-y-1 overflow-y-auto px-4">
          {filtered.length === 0 && (
            <div className="zivo-chat-card flex min-h-32 items-center justify-center p-6 text-center">
              <p className="text-sm font-semibold text-muted-foreground">No contacts found</p>
            </div>
          )}
          {filtered.map((c) => (
            <button type="button"
              key={c.id}
              onClick={() => toggle(c.contact_user_id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all ${
                selected.has(c.contact_user_id) ? "zivo-chat-row-unread" : "zivo-chat-row"
              }`}
            >
              <Checkbox checked={selected.has(c.contact_user_id)} />
              <div className="zivo-chat-avatar-ring h-10 w-10 shrink-0 overflow-hidden rounded-full">
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
                <div className="truncate text-sm font-black">{c.display_name || "Unnamed"}</div>
                {c.username && <div className="truncate text-xs font-semibold text-muted-foreground">@{c.username}</div>}
              </div>
            </button>
          ))}
        </div>
        {selected.size > 0 && (
          <div className="px-4 pt-3">
          <Input
            placeholder="Add a comment (optional)…"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            className="zivo-chat-search h-11"
            maxLength={500}
          />
          </div>
        )}
        <div className="zivo-chat-header-glass mt-3 px-4 py-3">
        <Button onClick={confirm} disabled={selected.size === 0} className="zivo-chat-chip-active h-12 w-full border-0 text-sm font-black">
          Forward {selected.size > 0 && `(${selected.size})`}
        </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
