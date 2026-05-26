/**
 * GroupInviteSheet — Admins generate, copy and revoke group invite links.
 *
 * Invite codes are stored in `chat_group_invites`. The shareable URL points to
 * `/chat/join/:code`, which is handled by `JoinGroupPage`.
 */
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import Copy from "lucide-react/dist/esm/icons/copy";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Plus from "lucide-react/dist/esm/icons/plus";
import { toast } from "sonner";
import { useGroupAdmin, type GroupInviteRow } from "@/hooks/useGroupAdmin";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

const inviteUrl = (code: string) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/chat/join/${code}`;

const inviteStatus = (inv: GroupInviteRow): { label: string; tone: "ok" | "warn" | "bad" } => {
  if (inv.revoked_at) return { label: "Revoked", tone: "bad" };
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now())
    return { label: "Expired", tone: "bad" };
  if (inv.max_uses != null && inv.use_count >= inv.max_uses)
    return { label: "Used up", tone: "bad" };
  return { label: "Active", tone: "ok" };
};

export default function GroupInviteSheet({ open, onOpenChange, groupId }: Props) {
  const { invites, isAdmin, createInvite, revokeInvite } = useGroupAdmin(groupId);
  const [creating, setCreating] = useState(false);
  const [expiry, setExpiry] = useState<number | null>(168); // 7 days default
  const [maxUses, setMaxUses] = useState<number | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    const inv = await createInvite({
      expiresInHours: expiry ?? undefined,
      maxUses: maxUses ?? undefined,
    });
    setCreating(false);
    if (inv) {
      try {
        await navigator.clipboard.writeText(inviteUrl(inv.code));
        toast.success("Invite link copied to clipboard");
      } catch {
        /* clipboard may be blocked — link is still in the list */
      }
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(code));
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe max-h-[85vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left flex items-center gap-2">
            <Link2 className="w-5 h-5" /> Invite links
          </SheetTitle>
        </SheetHeader>

        {isAdmin ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs">
              <span className="block text-muted-foreground mb-1">Expires in</span>
              <select
                value={expiry ?? ""}
                onChange={(e) => setExpiry(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
              >
                <option value="1">1 hour</option>
                <option value="24">1 day</option>
                <option value="168">7 days</option>
                <option value="720">30 days</option>
                <option value="">Never</option>
              </select>
            </label>
            <label className="text-xs">
              <span className="block text-muted-foreground mb-1">Max uses</span>
              <select
                value={maxUses ?? ""}
                onChange={(e) => setMaxUses(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
              >
                <option value="">Unlimited</option>
                <option value="1">1</option>
                <option value="5">5</option>
                <option value="25">25</option>
                <option value="100">100</option>
              </select>
            </label>
            <Button
              className="col-span-2"
              onClick={handleCreate}
              disabled={creating}
            >
              <Plus className="w-4 h-4 mr-2" /> Create new invite link
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Only admins can create invite links.
          </p>
        )}

        <div className="mt-4 flex-1 overflow-y-auto space-y-2">
          {invites.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No invite links yet
            </p>
          )}
          {invites.map((inv) => {
            const status = inviteStatus(inv);
            const url = inviteUrl(inv.code);
            return (
              <div
                key={inv.id}
                className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs truncate font-mono">{url}</code>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      status.tone === "ok"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {inv.use_count}{inv.max_uses != null ? ` / ${inv.max_uses}` : ""} used
                  </span>
                  <span>
                    {inv.expires_at
                      ? `Expires ${format(new Date(inv.expires_at), "MMM d, h:mm a")}`
                      : "Never expires"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCopy(inv.code)}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                  </Button>
                  {isAdmin && !inv.revoked_at && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => revokeInvite(inv.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
