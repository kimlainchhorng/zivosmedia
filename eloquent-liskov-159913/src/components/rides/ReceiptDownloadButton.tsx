import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  rideRequestId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export default function ReceiptDownloadButton({ rideRequestId, variant = "outline", size = "sm", className }: Props) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("get-receipt-signed-url", {
      body: { ride_request_id: rideRequestId },
    });
    setLoading(false);
    if (error || (data as any)?.error || !(data as any)?.url) {
      toast.error((data as any)?.error || "Receipt not ready yet");
      return;
    }
    window.open((data as any).url, "_blank", "noopener,noreferrer");
  };

  return (
    <Button onClick={onClick} disabled={loading} variant={variant} size={size} className={`gap-1.5 ${className ?? ""}`}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      Receipt
    </Button>
  );
}
