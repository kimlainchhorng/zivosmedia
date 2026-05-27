/**
 * AddContactSheet — Add a contact by @username (no phone required).
 * Future: QR scan + invite-link redeem will land here too.
 */
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, AtSign, UserPlus, QrCode, Link as LinkIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useContacts } from "@/hooks/useContacts";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUsername } from "@/hooks/useUsername";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { useZivoOFMode } from "@/hooks/useZivoOFMode";

interface ContactSearchResult {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function AddContactSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { findByUsername, add } = useContacts();
  const { user } = useAuth();
  const { username } = useUsername();
  const navigate = useNavigate();
  const { isOFMode: zivoOFMode } = useZivoOFMode();
  const [value, setValue] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<ContactSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const dragStartYRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const inviteLink = username
    ? `${getPublicOrigin()}/u/${encodeURIComponent(username)}`
    : user?.id
      ? `${getPublicOrigin()}/user/${encodeURIComponent(user.id)}`
      : getPublicOrigin();

  async function onSearch() {
    setError(null); setResult(null);
    if (!value.trim()) return;
    setSearching(true);
    const r = await findByUsername(value);
    setSearching(false);
    if (r.error) setError(r.error);
    else setResult(r.user);
  }

  async function onAdd() {
    if (!result) return;
    setAdding(true);
    const r = await add(result.user_id, { via: "username" });
    setAdding(false);
    if (r.ok) {
      toast.success("Contact added");
      onOpenChange(false);
      setValue(""); setResult(null);
    } else {
      toast.error(r.error || "Couldn't add contact");
    }
  }

  useEffect(() => {
    if (!open) {
      dragStartYRef.current = null;
      dragOffsetRef.current = 0;
      setDragOffset(0);
      setDragging(false);
    }
  }, [open]);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    dragStartYRef.current = event.clientY;
    dragOffsetRef.current = 0;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragStartYRef.current === null) return;
    const nextOffset = Math.max(0, event.clientY - dragStartYRef.current);
    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  }

  function endDrag() {
    if (dragOffsetRef.current > 84) {
      onOpenChange(false);
    }
    dragStartYRef.current = null;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setDragging(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[calc(100dvh-0.75rem)] overflow-hidden rounded-t-[28px] border-border bg-background p-0 text-foreground"
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: dragging ? "none" : undefined,
        }}
      >
        <div
          className="flex cursor-grab touch-none justify-center px-6 pb-1 pt-2 active:cursor-grabbing"
          role="button"
          tabIndex={0}
          aria-label="Drag down to close"
          onClick={() => onOpenChange(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenChange(false);
            }
          }}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className="h-1.5 w-14 rounded-full bg-muted-foreground/25" />
        </div>

        <div className="max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain px-5 pb-[calc(6.5rem+var(--zivo-safe-bottom,0px))] pt-2">
          <SheetHeader className="pr-12 text-left">
            <SheetTitle className="flex items-center gap-2 text-[22px] leading-tight">
              {zivoOFMode ? (
                <>
                  <LinkIcon className="h-5 w-5 shrink-0 text-[#00AEEF]" /> Share my page
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 shrink-0 text-primary" /> Add a contact
                </>
              )}
            </SheetTitle>
            <SheetDescription className="text-[15px] leading-relaxed">
              {zivoOFMode
                ? "Send fans your QR code or page link to subscribe."
                : "Find people by their @username — no phone needed."}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-4">
            {!zivoOFMode && (
              <>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value.replace(/[^a-zA-Z0-9_@]/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && onSearch()}
                    placeholder="username"
                    className="h-14 rounded-2xl pl-9 pr-12 text-base"
                    maxLength={33}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onSearch}
                    disabled={searching || !value.trim()}
                    className="absolute right-1.5 top-1/2 h-10 -translate-y-1/2 rounded-full px-3"
                  >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                {result && (
                  <div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={result.avatar_url ?? undefined} />
                      <AvatarFallback>{(result.full_name ?? result.username ?? "?").slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{result.full_name ?? `@${result.username}`}</div>
                      <div className="truncate text-xs text-muted-foreground">@{result.username}</div>
                    </div>
                    <Button size="sm" onClick={onAdd} disabled={adding} className="bg-emerald-500 text-white hover:bg-emerald-600">
                      {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                    </Button>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => { onOpenChange(false); navigate("/qr-profile"); }}
                className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-4 transition hover:bg-muted active:scale-95"
              >
                <QrCode className={`h-7 w-7 ${zivoOFMode ? "text-[#00AEEF]" : "text-emerald-500"}`} />
                <span className="text-sm font-medium">My QR code</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(inviteLink);
                  toast.success(zivoOFMode ? "Page link copied" : "Invite link copied");
                }}
                className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-4 transition hover:bg-muted active:scale-95"
              >
                <LinkIcon className={`h-7 w-7 ${zivoOFMode ? "text-[#00AEEF]" : "text-emerald-500"}`} />
                <span className="text-sm font-medium">{zivoOFMode ? "Share page link" : "Share invite link"}</span>
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
