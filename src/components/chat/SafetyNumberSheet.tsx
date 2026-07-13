/**
 * SafetyNumberSheet — show the 60-digit Safety Number both sides should
 * compare to confirm there is no MITM (Signal-style SAS).
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Copy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  getSafetyNumber: () => Promise<string | null>;
  partnerName: string;
}

export default function SafetyNumberSheet({ open, onOpenChange, getSafetyNumber, partnerName }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void getSafetyNumber().then((v) => {
      setCode(v);
      setLoading(false);
    });
  }, [open, getSafetyNumber]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="zivo-chat-popover-glass rounded-t-[1.75rem] border-white/10 px-0 pb-8 shadow-2xl">
        <div className="zivo-chat-header-glass px-5 pb-4 pt-5">
          <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-foreground/20" />
        <SheetHeader className="text-center">
          <div className="zivo-chat-avatar-ring mx-auto rounded-2xl p-3 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Encrypted trust</p>
          <SheetTitle className="text-xl font-black">Safety Number</SheetTitle>
          <SheetDescription className="mx-auto max-w-sm text-sm font-semibold leading-relaxed text-muted-foreground">
            Compare this 60-digit code with {partnerName} in person or by voice. If they match,
            your conversation is end-to-end encrypted with no one in the middle.
          </SheetDescription>
        </SheetHeader>
        </div>

        <div className="mx-auto mt-5 max-w-sm px-4">
          {loading || !code ? (
            <div className="zivo-chat-card grid h-32 place-items-center text-sm font-semibold text-muted-foreground">Computing…</div>
          ) : (
            <div className="zivo-chat-card grid grid-cols-4 gap-2 p-4 font-mono text-sm tabular-nums">
              {code.split(" ").map((g, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-background/60 py-2 text-center font-bold shadow-sm">{g}</div>
              ))}
            </div>
          )}
          <Button
            variant="ghost"
            className="zivo-chat-chip-active mt-3 h-11 w-full font-black"
            onClick={() => {
              if (!code) return;
              void navigator.clipboard.writeText(code);
              toast.success("Safety number copied");
            }}
          >
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
