/**
 * InviteFriendsSheet — Share a personal invite link via SMS, email, native share or copy.
 * Also supports sending a ZIVO contact request to an existing user by @username.
 * Falls back to mailto:/sms: when native share is unavailable.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, MessageSquare, Mail, Copy, Check, Send, AtSign, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUsername } from "@/hooks/useUsername";
import { useAuth } from "@/contexts/AuthContext";
import { useContacts } from "@/hooks/useContacts";
import { useContactRequests } from "@/hooks/useContactRequests";
import { getPublicOrigin } from "@/lib/getPublicOrigin";

export default function InviteFriendsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { username } = useUsername();
  const { user } = useAuth();
  const { findByUsername } = useContacts();
  const { send: sendRequest } = useContactRequests();
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [sending, setSending] = useState(false);

  const inviteLink = useMemo(() => {
    const base = getPublicOrigin();
    if (username) return `${base}/u/${encodeURIComponent(username)}`;
    if (user?.id) return `${base}/user/${encodeURIComponent(user.id)}`;
    return base;
  }, [username, user]);

  const message = `Join me on ZIVO — ${inviteLink}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Invite link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = inviteLink;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast.success("Invite link copied"); } catch { toast.error("Couldn't copy"); }
      document.body.removeChild(ta);
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: "Join me on ZIVO", text: message, url: inviteLink });
      } catch { /* user cancelled */ }
    } else {
      copyLink();
    }
  }

  function sendSms() {
    const num = phone.replace(/[^\d+]/g, "");
    const href = num ? `sms:${num}?&body=${encodeURIComponent(message)}` : `sms:?&body=${encodeURIComponent(message)}`;
    window.location.href = href;
  }

  function sendEmail() {
    const href = `mailto:${email.trim()}?subject=${encodeURIComponent("Join me on ZIVO")}&body=${encodeURIComponent(message)}`;
    window.location.href = href;
  }

  async function sendInviteRequest() {
    const clean = handle.trim().replace(/^@/, "");
    if (!clean) {
      toast.error("Enter a @username");
      return;
    }
    setSending(true);
    try {
      const { user: prof, error } = await findByUsername(clean);
      if (error || !prof?.user_id) {
        toast.error("No ZIVO user with that handle. Share your invite link instead.");
        return;
      }
      if (user && prof.user_id === user.id) {
        toast.error("That's you 🙂");
        return;
      }
      const r: any = await sendRequest(prof.user_id, "Hi! Let's connect on ZIVO.");
      if (!r.ok) {
        toast.error(r.error || "Couldn't send request");
        return;
      }
      if (r.duplicate) {
        toast.success("You already have a pending request with that user.", {
          action: { label: "View", onClick: () => navigate("/chat/contacts/requests?tab=out") },
        });
      } else {
        toast.success("Request sent. Track it in Requests → Sent.", {
          action: { label: "View", onClick: () => navigate("/chat/contacts/requests?tab=out") },
        });
      }
      setHandle("");
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-500" /> Invite friends
          </SheetTitle>
          <SheetDescription>Send your personal link via SMS, email or share sheet.</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {/* Link card */}
          <div className="flex items-center gap-2 p-3 rounded-2xl border bg-muted/40">
            <div className="flex-1 min-w-0 text-sm font-mono truncate">{inviteLink}</div>
            <Button size="sm" variant="outline" onClick={copyLink} className="gap-1">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <Button onClick={nativeShare} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
            <Share2 className="w-4 h-4" /> Share via…
          </Button>

          {/* SMS */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Send by SMS
            </label>
            <div className="flex gap-2">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567 (optional)"
                inputMode="tel"
              />
              <Button onClick={sendSms} variant="outline" className="gap-1">
                <Send className="w-4 h-4" /> SMS
              </Button>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Send by email
            </label>
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
                type="email"
                inputMode="email"
              />
              <Button onClick={sendEmail} variant="outline" className="gap-1">
                <Send className="w-4 h-4" /> Email
              </Button>
            </div>
          </div>

          {/* Existing user — send contact request */}
          <div className="space-y-2 pt-1 border-t">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 pt-3">
              <AtSign className="w-3.5 h-3.5" /> Invite an existing ZIVO user
            </label>
            <div className="flex gap-2">
              <Input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@username"
                aria-label="ZIVO username"
                onKeyDown={(e) => { if (e.key === "Enter") void sendInviteRequest(); }}
              />
              <Button
                onClick={() => void sendInviteRequest()}
                disabled={sending}
                className="gap-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Send request
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Sends a contact request — you'll see its status on the Requests tab.
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Your link is public — anyone with it can view your ZIVO profile.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
