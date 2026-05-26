import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  rideRequestId: string;
}

export default function ShareTripButton({ rideRequestId }: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-trip-share", {
        body: { ride_request_id: rideRequestId },
      });
      if (error) throw error;
      setUrl((data as any).url);
    } catch (e: any) {
      toast.error(e.message ?? "Could not create share link");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const nativeShare = async () => {
    if (!url) return;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title: "My ZIVO trip", text: "Track my ride live:", url });
      } catch {}
    } else {
      copy();
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o && !url) create(); }}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2"><Share2 className="w-4 h-4" />Share trip</Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader><SheetTitle>Share live trip status</SheetTitle></SheetHeader>
        <div className="space-y-4 pt-4">
          {loading && <p className="text-sm text-muted-foreground">Creating link…</p>}
          {url && (
            <>
              <div className="p-3 rounded-lg bg-muted text-sm font-mono break-all">{url}</div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={copy} variant="outline" className="gap-2">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <Button onClick={nativeShare} className="gap-2"><Share2 className="w-4 h-4" />Share</Button>
                <Button asChild variant="outline"><a href={`sms:?body=${encodeURIComponent(`Track my ZIVO ride: ${url}`)}`}>SMS</a></Button>
                <Button asChild variant="outline"><a target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(`Track my ZIVO ride: ${url}`)}`}>WhatsApp</a></Button>
              </div>
              <p className="text-xs text-muted-foreground">Link auto-expires in 4 hours or when the trip ends.</p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
