import { useEffect, useMemo, useState } from "react";
import { useSmartBack } from "@/lib/smartBack";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AtSign,
  Inbox,
  Loader2,
  MessageCircle,
  Phone,
  QrCode,
  Search,
  Share2,
  Smartphone,
  UserPlus,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { hashPhoneE164 } from "@/lib/phoneHash";
import { isNativeAvailable, pickAndHashPhones } from "@/lib/nativeContacts";
import { useContacts } from "@/hooks/useContacts";
import { useContactRequests } from "@/hooks/useContactRequests";
import ConfirmAddContactSheet, { type AddTarget } from "@/components/chat/ConfirmAddContactSheet";
import InviteFriendsSheet from "@/components/chat/InviteFriendsSheet";
import UsernameClaimSheet from "@/components/chat/UsernameClaimSheet";
import { useUsername } from "@/hooks/useUsername";
import { useAuth } from "@/contexts/AuthContext";

interface Match {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface ContactMatchResponse {
  matches?: Match[];
}

export default function FindContactsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = useSmartBack("/chat");
  const [raw, setRaw] = useState("");
  const [scanning, setScanning] = useState(false);
  const initialMatches = (location.state as any)?.matches as Match[] | undefined;
  const [matches, setMatches] = useState<Match[] | null>(initialMatches ?? null);
  const [nativeReady, setNativeReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<AddTarget | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [handle, setHandle] = useState("");
  const [handleSearching, setHandleSearching] = useState(false);
  const [handleResult, setHandleResult] = useState<Match | null>(null);
  const [handleError, setHandleError] = useState<string | null>(null);

  const { contacts, findByUsername } = useContacts();
  const { incoming, outgoing, refresh: refreshRequests } = useContactRequests();
  const { username } = useUsername();
  const { user } = useAuth();
  const contactIds = useMemo(() => new Set((contacts ?? []).map((c) => c.contact_user_id)), [contacts]);
  const pendingIds = useMemo(
    () => new Set((outgoing ?? []).filter((r) => r.status === "pending").map((r) => r.to_user_id)),
    [outgoing]
  );
  const detectedPhones = useMemo(() => parsePhones(raw), [raw]);
  const pendingCount = useMemo(() => (outgoing ?? []).filter((r) => r.status === "pending").length, [outgoing]);

  useEffect(() => {
    let alive = true;
    void isNativeAvailable().then((v) => { if (alive) setNativeReady(v); });
    return () => { alive = false; };
  }, []);

  async function nativeSync() {
    setSyncing(true);
    try {
      const r = await pickAndHashPhones();
      if (!r.ok) {
        if (r.reason === "denied") toast.error("Permission denied. Enable Contacts in Settings.");
        else if (r.reason === "empty") toast.message("No phone numbers found in your contacts.");
        else toast.error("Couldn't read contacts on this device.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("contact-match", { body: { hashes: r.hashes } });
      if (error) throw error;
      const results = (data as ContactMatchResponse | null)?.matches ?? [];
      setMatches(results);
      toast.success(
        results.length
          ? `${results.length} of your ${r.count} contacts are on ZIVO`
          : `Scanned ${r.count} contacts — no matches yet`
      );
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "Sync failed";
      toast.error(m);
    } finally {
      setSyncing(false);
    }
  }

  function parsePhones(text: string): string[] {
    // Extract candidate phone numbers; keep + and digits.
    const found = new Set<string>();
    const re = /\+?\d[\d\s\-().]{6,}\d/g;
    const matches = text.match(re) ?? [];
    for (const m of matches) {
      const digits = m.replace(/[^\d+]/g, "");
      if (digits.length >= 7) found.add(digits.startsWith("+") ? digits : `+${digits}`);
    }
    return Array.from(found);
  }

  const searchByUsername = async () => {
    const clean = handle.trim().replace(/^@/, "");
    setHandleError(null);
    setHandleResult(null);
    if (!clean) {
      setHandleError("Enter a username to search.");
      return;
    }
    setHandleSearching(true);
    try {
      const r = await findByUsername(clean);
      if (r.error || !r.user?.user_id) {
        setHandleError(r.error || "No ZIVO user with that username.");
        return;
      }
      setHandleResult(r.user as Match);
    } finally {
      setHandleSearching(false);
    }
  };

  const scan = async () => {
    const phones = parsePhones(raw);
    if (phones.length === 0) {
      toast.error("No phone numbers detected");
      return;
    }
    setScanning(true);
    try {
      const hashes = await Promise.all(phones.map(hashPhoneE164));
      const { data, error } = await supabase.functions.invoke("contact-match", {
        body: { hashes },
      });
      if (error) throw error;
      const results = (data as ContactMatchResponse | null)?.matches ?? [];
      setMatches(results);
      toast.success(
        results.length
          ? `${results.length} of your contact${phones.length > 1 ? "s are" : " is"} on ZIVO`
          : `Scanned ${phones.length} contact${phones.length > 1 ? "s" : ""} — no matches yet`
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Couldn't match contacts";
      toast.error(message);
    } finally {
      setScanning(false);
    }
  };

  const openConfirm = (m: Match) => {
    setConfirmTarget({
      user_id: m.user_id,
      full_name: m.full_name,
      username: m.username,
      avatar_url: m.avatar_url,
    });
    setConfirmOpen(true);
  };

  const openChat = (m: Match) => {
    const name = m.full_name || (m.username ? `@${m.username}` : "ZIVO user");
    navigate("/chat", {
      state: {
        openChat: { recipientId: m.user_id, recipientName: name, recipientAvatar: m.avatar_url || null },
      },
    });
  };

  const personAction = (m: Match) => {
    if (user?.id === m.user_id) {
      return (
        <Button size="sm" variant="ghost" onClick={() => navigate("/profile")} className="gap-1 text-primary">
          You
        </Button>
      );
    }
    if (contactIds.has(m.user_id)) {
      return (
        <Button size="sm" variant="ghost" onClick={() => openChat(m)} className="gap-1 text-emerald-600">
          <MessageCircle className="h-4 w-4" /> Message
        </Button>
      );
    }
    if (pendingIds.has(m.user_id)) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate("/chat/contacts/requests?tab=out")}
          className="gap-1 border-amber-300 text-amber-600"
        >
          <Loader2 className="h-4 w-4" /> Pending
        </Button>
      );
    }
    return (
      <Button size="sm" variant="outline" onClick={() => openConfirm(m)} className="gap-1">
        <UserPlus className="h-4 w-4" /> Add
      </Button>
    );
  };

  const personCard = (m: Match) => (
    <div key={m.user_id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <Avatar className="h-11 w-11">
        <AvatarImage src={m.avatar_url ?? undefined} />
        <AvatarFallback>
          {(m.full_name ?? m.username ?? "?").slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <button type="button" onClick={() => navigate(`/user/${m.user_id}`)} className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-semibold text-foreground">
          {m.full_name ?? m.username ?? "ZIVO user"}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {m.username ? `@${m.username}` : "View profile"}
        </div>
      </button>
      {personAction(m)}
    </div>
  );

  return (
    <div className="zivo-shell-mobile mx-auto max-w-2xl bg-background text-foreground pb-24">
      <header className="zivo-sticky-mobile z-20 flex items-center gap-2 px-3 py-3 pt-safe">
        <Button variant="ghost" size="icon" onClick={goBack} aria-label="Back" className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold">Find contacts</h1>
          <p className="truncate text-xs text-muted-foreground">
            {contacts.length} saved · {pendingCount} sent · {incoming.length} request{incoming.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/chat/contacts/requests")}
          aria-label="Contact requests"
          className="relative rounded-full"
        >
          <Inbox className="h-5 w-5" />
          {incoming.length > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white ring-2 ring-background">
              {incoming.length > 9 ? "9+" : incoming.length}
            </span>
          )}
        </Button>
      </header>

      <div className="space-y-4 p-4">
        <section className="rounded-[28px] border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Users className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold leading-tight">Build your people list</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Search by username, match phone contacts privately, invite friends, then start chat from one place.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            <Button variant="outline" onClick={() => navigate("/chat/contacts")} className="h-auto min-h-16 flex-col gap-1 rounded-2xl px-2 py-2">
              <Users className="h-4 w-4" />
              <span className="text-[11px]">Contacts</span>
            </Button>
            <Button variant="outline" onClick={() => navigate("/qr-profile")} className="h-auto min-h-16 flex-col gap-1 rounded-2xl px-2 py-2">
              <QrCode className="h-4 w-4" />
              <span className="text-[11px]">My QR</span>
            </Button>
            <Button variant="outline" onClick={() => setInviteOpen(true)} className="h-auto min-h-16 flex-col gap-1 rounded-2xl px-2 py-2">
              <Share2 className="h-4 w-4" />
              <span className="text-[11px]">Invite</span>
            </Button>
            <Button variant="outline" onClick={() => setUsernameOpen(true)} className="h-auto min-h-16 flex-col gap-1 rounded-2xl px-2 py-2">
              <AtSign className="h-4 w-4" />
              <span className="text-[11px]">{username ? "Handle" : "Set @"}</span>
            </Button>
          </div>
        </section>

        <section className="rounded-[24px] border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <AtSign className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Find by username</h2>
              <p className="text-xs text-muted-foreground">Fastest way to add someone without a phone number.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={handle}
                onChange={(e) => {
                  setHandle(e.target.value.replace(/[^a-zA-Z0-9_@.]/g, ""));
                  setHandleError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && searchByUsername()}
                placeholder="username"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="h-12 rounded-2xl pl-9"
              />
            </div>
            <Button onClick={searchByUsername} disabled={handleSearching || !handle.trim()} className="h-12 rounded-2xl px-4">
              {handleSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="sr-only">Search username</span>
            </Button>
          </div>
          {handleError && <p className="mt-2 text-sm text-destructive">{handleError}</p>}
          {handleResult && <div className="mt-3">{personCard(handleResult)}</div>}
        </section>

        {nativeReady && (
          <section className="rounded-[24px] border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-bold">
              <Smartphone className="h-4 w-4 text-emerald-600" />
              Sync from your phone
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Read contacts directly from this device. Numbers are hashed on-device — only hashes are sent.
            </p>
            <Button onClick={nativeSync} disabled={syncing} className="gap-2 bg-emerald-500 text-white hover:bg-emerald-600">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              Sync now
            </Button>
          </section>
        )}

        <section className="rounded-[24px] border border-border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Phone className="h-4 w-4 text-primary" />
            Paste or type phone numbers
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            We hash numbers locally with SHA-256 — your raw contacts never leave your device.
            Use full international format (e.g. <span className="font-mono">+15551234567</span>),
            one per line or comma-separated.
          </p>
          <Textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"+15551234567\n+447700900000\n+85512345678"}
            rows={6}
            className="rounded-2xl font-mono text-sm"
          />
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={scan} disabled={scanning || detectedPhones.length === 0} className="gap-2 rounded-2xl">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Scan {detectedPhones.length > 0 ? detectedPhones.length : ""} & Match
            </Button>
            <Button variant="ghost" onClick={() => setInviteOpen(true)} className="rounded-2xl">
              Invite instead
            </Button>
          </div>
        </section>

        {matches !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-foreground">Matches ({matches.length})</h2>
              <Button variant="ghost" size="sm" onClick={() => setMatches(null)} className="h-8 rounded-full">
                Clear
              </Button>
            </div>
            {matches.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-border bg-card p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Share2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold">No matches yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  None of those numbers are on ZIVO. Send your invite link so they can join you.
                </p>
                <Button onClick={() => setInviteOpen(true)} className="mt-4 rounded-2xl">
                  Invite friends
                </Button>
              </div>
            ) : (
              <div className="space-y-2">{matches.map((m) => personCard(m))}</div>
            )}
          </div>
        )}
      </div>
      <ConfirmAddContactSheet
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        target={confirmTarget}
        onSent={() => { void refreshRequests(); }}
      />
      <InviteFriendsSheet open={inviteOpen} onOpenChange={setInviteOpen} />
      <UsernameClaimSheet open={usernameOpen} onOpenChange={setUsernameOpen} />
    </div>
  );
}
