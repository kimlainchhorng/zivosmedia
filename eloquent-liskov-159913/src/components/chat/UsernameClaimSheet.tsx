/**
 * UsernameClaimSheet — Telegram-style @username claim flow.
 * Lets users be reachable WITHOUT a phone number.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, AtSign } from "lucide-react";
import { useUsername, validateUsername } from "@/hooks/useUsername";
import { toast } from "sonner";

export default function UsernameClaimSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { username, claim, checkAvailability } = useUsername();
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(username ?? "");
  }, [open, username]);

  useEffect(() => {
    setStatus(null);
    if (!value) return;
    const err = validateUsername(value);
    if (err) { setStatus({ ok: false, msg: err }); return; }
    if (value === username) { setStatus({ ok: true, msg: "This is your current username" }); return; }
    setChecking(true);
    const t = setTimeout(async () => {
      const r = await checkAvailability(value);
      setChecking(false);
      setStatus({ ok: r.available, msg: r.available ? "Available" : (r.error || "Not available") });
    }, 400);
    return () => clearTimeout(t);
  }, [value, username, checkAvailability]);

  async function onSave() {
    if (!status?.ok) return;
    if (value === username) { onOpenChange(false); return; }
    setSaving(true);
    const res = await claim(value);
    setSaving(false);
    if (res.ok) {
      toast.success(`You're now @${value}`);
      onOpenChange(false);
    } else {
      toast.error(res.error || "Couldn't save username");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh]">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <AtSign className="w-5 h-5 text-primary" /> Choose a username
          </SheetTitle>
          <SheetDescription>
            People can find you by your username — no phone number needed.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              placeholder="your_handle"
              className="pl-7 text-base"
              maxLength={32}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {checking ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> :
                status?.ok ? <Check className="w-4 h-4 text-emerald-500" /> :
                status ? <X className="w-4 h-4 text-destructive" /> : null}
            </div>
          </div>
          {status && (
            <p className={`text-sm ${status.ok ? "text-emerald-600" : "text-destructive"}`}>
              {status.msg}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Your link: <span className="font-medium">hizivo.com/u/{value || "your_handle"}</span>
          </p>

          <Button
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            disabled={!status?.ok || saving || checking}
            onClick={onSave}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save username"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
