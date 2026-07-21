/**
 * ContactsPage — Telegram-style contacts (no phone required).
 * Sections: Favorites · Recently added · A–Z. Plus search-everyone fallback,
 * suggested people, native phone sync entry, blocked-users access, and invite.
 */
import { useEffect, useMemo, useState } from "react";
import { useSmartBack } from "@/lib/smartBack";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, UserPlus, Star, MoreVertical, MessageCircle, Trash2,
  AtSign, Phone, Inbox, ShieldOff, Lock, Share2, QrCode, Smartphone, Clock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AddContactSheet from "@/components/chat/AddContactSheet";
import UsernameClaimSheet from "@/components/chat/UsernameClaimSheet";
import InviteFriendsSheet from "@/components/chat/InviteFriendsSheet";
import SuggestedContactsRow from "@/components/chat/SuggestedContactsRow";
import SearchEveryoneResults from "@/components/chat/SearchEveryoneResults";
import { useContacts, type Contact } from "@/hooks/useContacts";
import { useUsername } from "@/hooks/useUsername";
import { useContactRequests } from "@/hooks/useContactRequests";
import { isNativeAvailable, pickAndHashPhones } from "@/lib/nativeContacts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function displayName(c: Contact): string {
  return (
    c.custom_name ||
    c.profile?.full_name ||
    (c.profile?.username ? `@${c.profile.username}` : "Unknown")
  );
}

export default function ContactsPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/chat");
  const { contacts, loading, toggleFavorite, remove } = useContacts();
  const { username } = useUsername();
  const { incoming } = useContactRequests();
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [nativeReady, setNativeReady] = useState(false);
  const [syncingNative, setSyncingNative] = useState(false);

  useEffect(() => {
    let alive = true;
    void isNativeAvailable().then((v) => { if (alive) setNativeReady(v); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return contacts;
    return contacts.filter((c) => {
      const name = displayName(c).toLowerCase();
      return name.includes(s) || c.profile?.username?.toLowerCase().includes(s);
    });
  }, [contacts, q]);

  // Group when not searching
  const groups = useMemo(() => {
    if (q.trim()) return null;
    const favorites = contacts.filter((c) => c.favorite);
    const now = Date.now();
    const recents = contacts
      .filter((c) =>
        !c.favorite &&
        c.added_via !== "chat_history" &&
        now - new Date(c.created_at).getTime() < SEVEN_DAYS
      )
      .slice(0, 5);
    const recentIds = new Set(recents.map((r) => r.contact_user_id));
    const rest = contacts
      .filter((c) => !c.favorite && !recentIds.has(c.contact_user_id))
      .sort((a, b) => displayName(a).localeCompare(displayName(b), undefined, { sensitivity: "base" }));
    const byLetter = new Map<string, Contact[]>();
    rest.forEach((c) => {
      const ch = displayName(c).replace(/^@/, "").charAt(0).toUpperCase();
      const key = /[A-Z]/.test(ch) ? ch : "#";
      const arr = byLetter.get(key) ?? [];
      arr.push(c);
      byLetter.set(key, arr);
    });
    return { favorites, recents, byLetter: Array.from(byLetter.entries()) };
  }, [contacts, q]);

  async function syncPhone() {
    // On native devices: read contacts directly, hash on-device, then jump to results.
    if (nativeReady && !syncingNative) {
      setSyncingNative(true);
      try {
        const r = await pickAndHashPhones();
        if (!r.ok) {
          if (r.reason === "denied") toast.error("Permission denied. Enable Contacts in Settings.");
          else if (r.reason === "empty") toast.message("No phone numbers found in your contacts.");
          else toast.error("Couldn't read contacts on this device.");
          navigate("/chat/find-contacts");
          return;
        }
        const { data } = await supabase.functions.invoke("contact-match", { body: { hashes: r.hashes } });
        const results = (data as any)?.matches ?? [];
        toast.success(
          results.length
            ? `${results.length} of your ${r.count} contacts are on ZIVO`
            : `Scanned ${r.count} contacts — no matches yet`
        );
        navigate("/chat/find-contacts", { state: { matches: results } });
      } catch {
        navigate("/chat/find-contacts");
      } finally {
        setSyncingNative(false);
      }
      return;
    }
    navigate("/chat/find-contacts");
  }

  function openChat(c: Contact, name: string) {
    navigate("/chat", {
      state: {
        openChat: {
          recipientId: c.contact_user_id,
          recipientName: name,
          recipientAvatar: c.profile?.avatar_url || null,
        },
      },
    });
  }

  function ContactRow({ c }: { c: Contact }) {
    const name = displayName(c);
    return (
      <li className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40">
        <button type="button"
          onClick={() => openChat(c, name)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <Avatar className="w-11 h-11">
            <AvatarImage src={c.profile?.avatar_url ?? undefined} />
            <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate flex items-center gap-1.5">
              {name}
              {c.favorite && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {c.profile?.username ? `@${c.profile.username}` : "—"}
            </div>
          </div>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`More actions for ${name}`}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openChat(c, name)}>
              <MessageCircle className="w-4 h-4 mr-2" /> Message
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/chat/secret/${c.contact_user_id}`)}>
              <Lock className="w-4 h-4 mr-2" /> Secret chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleFavorite(c.contact_user_id, !c.favorite)}>
              <Star className="w-4 h-4 mr-2" /> {c.favorite ? "Remove favorite" : "Mark favorite"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => { await remove(c.contact_user_id); toast.success("Contact removed"); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </li>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b px-4 py-3 flex items-center gap-2 safe-area-top">
        <button type="button"
          onClick={goBack}
          aria-label="Go back"
          title="Back"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex-1">Contacts</h1>
        <Button
          size="icon" variant="ghost"
          onClick={() => setInviteOpen(true)}
          aria-label="Invite friends" title="Invite friends"
          className="focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Share2 className="w-5 h-5" />
        </Button>
        <Button
          size="icon" variant="ghost"
          onClick={() => navigate("/qr-profile")}
          aria-label="Open QR code" title="QR code"
          className="focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <QrCode className="w-5 h-5" />
        </Button>
        <Button
          size="icon" variant="ghost"
          onClick={() => setAddOpen(true)}
          aria-label="Add contact" title="Add contact"
          className="focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <UserPlus className="w-5 h-5" />
        </Button>
      </header>

      <div className="px-4 py-3 space-y-3">
        <button type="button"
          onClick={() => setUsernameOpen(true)}
          className="w-full flex items-center gap-3 p-3 rounded-2xl border bg-card hover:bg-muted/50 active:scale-[0.99] transition text-left"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <AtSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium">{username ? `@${username}` : "Set your username"}</div>
            <div className="text-xs text-muted-foreground">
              {username ? "Tap to change. Your username is how friends find you." : "Be reachable without a phone number."}
            </div>
          </div>
        </button>

        <nav aria-label="Contact quick actions" className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => navigate("/chat/find-contacts")}
            aria-label="Find people by phone number"
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border bg-card hover:bg-muted/50 active:scale-[0.98] transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <div className="w-9 h-9 rounded-full bg-secondary text-foreground flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-medium leading-tight text-center">Find by phone</span>
          </button>
          <button
            type="button"
            onClick={syncPhone}
            disabled={syncingNative}
            aria-label={nativeReady ? "Sync contacts from your phone" : "Sync contacts (paste numbers)"}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border bg-card hover:bg-muted/50 active:scale-[0.98] transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none disabled:opacity-60"
          >
            <div className="w-9 h-9 rounded-full bg-secondary text-foreground flex items-center justify-center">
              <Smartphone className={`w-4 h-4 ${syncingNative ? "animate-pulse" : ""}`} />
            </div>
            <span className="text-[11px] font-medium leading-tight text-center">{syncingNative ? "Syncing…" : "Sync phone"}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/chat/contacts/requests")}
            aria-label={incoming.length > 0
              ? `View contact requests, ${incoming.length} pending`
              : "View incoming and sent contact requests"}
            className="relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border bg-card hover:bg-muted/50 active:scale-[0.98] transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <div className="relative w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
              {incoming.length > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-background"
                >
                  {incoming.length > 99 ? "99+" : incoming.length}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium leading-tight text-center">Requests</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/chat/blocked")}
            aria-label="View blocked users"
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border bg-card hover:bg-muted/50 active:scale-[0.98] transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <div className="w-9 h-9 rounded-full bg-secondary text-foreground flex items-center justify-center">
              <ShieldOff className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-medium leading-tight text-center">Blocked</span>
          </button>
        </nav>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search contacts"
            className="pl-9"
            aria-label="Search your contacts"
          />
        </div>
      </div>

      {!q.trim() && <SuggestedContactsRow />}

      <div className="px-2 pb-24">
        {loading ? (
          <div className="text-center text-muted-foreground py-12 text-sm">Loading…</div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
              <UserPlus className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No contacts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Build your list — add by username, sync from phone or invite friends.
            </p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <Button onClick={() => setAddOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <AtSign className="w-4 h-4 mr-2" /> Add by @username
              </Button>
              <Button variant="outline" onClick={syncPhone}>
                <Smartphone className="w-4 h-4 mr-2" /> Sync from phone
              </Button>
              <Button variant="outline" onClick={() => setInviteOpen(true)}>
                <Share2 className="w-4 h-4 mr-2" /> Invite friends
              </Button>
            </div>
          </div>
        ) : q.trim() ? (
          <>
            {filtered.length > 0 ? (
              <ul className="divide-y">
                {filtered.map((c) => <ContactRow key={c.contact_user_id} c={c} />)}
              </ul>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-6 px-6">
                No contacts match "{q}".
              </div>
            )}
            <SearchEveryoneResults query={q} />
          </>
        ) : groups ? (
          <div className="space-y-2">
            {groups.favorites.length > 0 && (
              <section>
                <div className="px-3 pt-3 pb-1 flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Favorites
                </div>
                <ul className="divide-y">{groups.favorites.map((c) => <ContactRow key={c.contact_user_id} c={c} />)}</ul>
              </section>
            )}
            {groups.recents.length > 0 && (
              <section>
                <div className="px-3 pt-3 pb-1 flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                  <Clock className="w-3 h-3" /> Recently added
                </div>
                <ul className="divide-y">{groups.recents.map((c) => <ContactRow key={c.contact_user_id} c={c} />)}</ul>
              </section>
            )}
            {groups.byLetter.map(([letter, list]) => (
              <section key={letter}>
                <div className="sticky top-[60px] z-10 px-3 pt-2 pb-1 text-[12px] font-semibold text-muted-foreground bg-background/80 backdrop-blur">
                  {letter}
                </div>
                <ul className="divide-y">{list.map((c) => <ContactRow key={c.contact_user_id} c={c} />)}</ul>
              </section>
            ))}
          </div>
        ) : null}
      </div>

      <AddContactSheet open={addOpen} onOpenChange={setAddOpen} />
      <UsernameClaimSheet open={usernameOpen} onOpenChange={setUsernameOpen} />
      <InviteFriendsSheet open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
