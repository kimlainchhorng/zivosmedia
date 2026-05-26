import { useState } from "react";
import { Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  rideRequestId: string;
  className?: string;
  label?: string;
}

export default function InTripCallButton({ rideRequestId, className, label = "Call" }: Props) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("create-masked-call-session", {
      body: { ride_request_id: rideRequestId },
    });
    setLoading(false);
    const proxy = (data as any)?.proxy_number;
    if (error || (data as any)?.error || !proxy) {
      toast.error((data as any)?.error || error?.message || "Could not start masked call");
      return;
    }
    toast.success("Calling via ZIVO — your number stays private");
    window.location.href = `tel:${proxy}`;
  };

  return (
    <Button onClick={onClick} disabled={loading} size="sm" className={`gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white ${className ?? ""}`}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
      {label}
    </Button>
  );
}
