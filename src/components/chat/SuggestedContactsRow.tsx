/**
 * SuggestedContactsRow — horizontal "People you may know" strip on Contacts page.
 * - Routes through ConfirmAddContactSheet → contact_requests
 * - Persistent dismiss via suggestion_dismissals
 * - Three-state action: Add → Pending → In contacts
 * - A11y labels and keyboard focus styles
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import UserCheck from "lucide-react/dist/esm/icons/user-check";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Check from "lucide-react/dist/esm/icons/check";
import X from "lucide-react/dist/esm/icons/x";
import { useSuggestedContacts, type Suggested } from "@/hooks/useSuggestedContacts";
import { useContacts } from "@/hooks/useContacts";
import { useContactRequests } from "@/hooks/useContactRequests";
import ConfirmAddContactSheet, { type AddTarget } from "./ConfirmAddContactSheet";

export default function SuggestedContactsRow() {
  const navigate = useNavigate();
  const { items, loading, isStale, dismiss } = useSuggestedContacts();
  const { contacts } = useContacts();
  const { outgoing } = useContactRequests();
  const [confirmTarget, setConfirmTarget] = useState<AddTarget | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pendingIds = new Set(
    (outgoing ?? []).filter((r) => r.status === "pending").map((r) => r.to_user_id)
  );
  const contactIds = new Set((contacts ?? []).map((c) => c.contact_user_id));

  if (loading || items.length === 0) return null;

  function openConfirm(s: Suggested) {
    setConfirmTarget({
      user_id: s.user_id,
      full_name: s.full_name,
      username: s.username,
      avatar_url: s.avatar_url,
    });
    setConfirmOpen(true);
  }

  function openContext(s: Suggested) {
    const name = s.full_name || (s.username ? `@${s.username}` : "ZIVO user");
    if (s.reason === "chat") {
      navigate("/chat", {
        state: {
          openChat: {
            recipientId: s.user_id,
            recipientName: name,
            recipientAvatar: s.avatar_url || null,
          },
        },
      });
    } else {
      const target = s.username ? `/u/${s.username}` : `/profile/${s.user_id}`;
      navigate(`${target}?context=followers`);
    }
  }

  return (
    <>
      <section
        role="group"
        aria-label="Suggested people you may know"
        className="zivo-chat-card mx-3 mb-2 rounded-3xl px-1 pb-2"
      >
        <div className="flex items-center justify-between px-3 py-2">
          <h2 className="text-[13px] font-semibold text-muted-foreground">People you may know</h2>
          <div className="flex items-center gap-1.5">
            {isStale && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" aria-hidden="true" />}
            <span className="text-[11px] text-muted-foreground">{items.length}</span>
          </div>
        </div>
        <ul className="flex gap-2 overflow-x-auto px-3 pb-1 scrollbar-none">
          {items.map((s) => {
            const name = s.full_name || (s.username ? `@${s.username}` : "ZIVO user");
            const isFollower = s.reason === "follower";
            const isPending = pendingIds.has(s.user_id);
            const inContacts = contactIds.has(s.user_id);
            const badgeLabel = isFollower ? "Follows you" : "Recent chat";
            const badgeAria = isFollower
              ? `Open profile, ${name} follows you`
              : `Open recent chat with ${name}`;
            return (
              <li
                key={s.user_id}
                className="zivo-chat-row relative flex w-[120px] shrink-0 flex-col items-center rounded-2xl p-2.5 text-center"
              >
                <button type="button"
                  onClick={() => void dismiss(s.user_id)}
                  aria-label={`Dismiss ${name}`}
                  className="zivo-chat-icon-button absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <X className="w-3 h-3" />
                </button>
                <Avatar className="zivo-chat-avatar-ring mb-1.5 h-12 w-12">
                  <AvatarImage src={s.avatar_url ?? undefined} />
                  <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-[12px] font-medium truncate w-full leading-tight">{name}</div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openContext(s); }}
                  aria-label={badgeAria}
                  className={
                    "mt-1 mb-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none " +
                    (isFollower
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25"
                      : "bg-primary/15 text-primary hover:bg-primary/25")
                  }
                >
                  {isFollower ? <UserCheck className="w-2.5 h-2.5" /> : <MessageCircle className="w-2.5 h-2.5" />}
                  {badgeLabel}
                </button>

                {inContacts ? (
                  <button
                    type="button"
                    onClick={() => openContext({ ...s, reason: "chat" })}
                    aria-label={`${name} is in your contacts — open chat`}
                    className="zivo-chat-chip flex h-7 w-full items-center justify-center gap-1 rounded-full text-[11px] font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <Check className="w-3 h-3" /> In contacts
                  </button>
                ) : isPending ? (
                  <button
                    type="button"
                    onClick={() => navigate("/chat/contacts/requests?tab=out")}
                    aria-label={`Request to ${name} pending — view sent requests`}
                    className="w-full h-7 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-semibold flex items-center justify-center gap-1 hover:bg-amber-500/25 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                  >
                    <Loader2 className="w-3 h-3" /> Pending
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openConfirm(s)}
                    aria-label={`Send contact request to ${name}`}
                    className="zivo-chat-chip-active flex h-7 w-full items-center justify-center gap-1 rounded-full text-[11px] font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                  >
                    <UserPlus className="w-3 h-3" /> Add
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <ConfirmAddContactSheet
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        target={confirmTarget}
      />
    </>
  );
}
