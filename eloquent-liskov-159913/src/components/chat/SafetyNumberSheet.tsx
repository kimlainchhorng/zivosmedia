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
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-center">
          <div className="mx-auto rounded-full bg-primary/10 p-3 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <SheetTitle>Safety Number</SheetTitle>
          <SheetDescription>
            Compare this 60-digit code with {partnerName} in person or by voice. If they match,
            your conversation is end-to-end encrypted with no one in the middle.
          </SheetDescription>
        </SheetHeader>

        <div className="mx-auto mt-5 max-w-sm">
          {loading || !code ? (
            <div className="grid h-32 place-items-center text-sm text-muted-foreground">Computing…</div>
          ) : (
            <div className="grid grid-cols-4 gap-2 rounded-2xl border border-border bg-muted/30 p-4 font-mono text-sm tabular-nums">
              {code.split(" ").map((g, i) => (
                <div key={i} className="rounded-md bg-background py-2 text-center">{g}</div>
              ))}
            </div>
          )}
          <Button
            variant="ghost"
            className="mt-3 w-full"
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
