import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ExternalLink, AlertTriangle, CheckCircle2, Copy } from "lucide-react";
import {
  isAllowedPartnerUrl, isPunycodeHost, hasSuspiciousTld,
  hasEmbeddedCredentials, isSafeProtocol,
} from "@/lib/urlSafety";
import { toast } from "sonner";

interface Props {
  url: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (url: string) => void;
}

interface RiskAssessment {
  level: "trusted" | "neutral" | "suspicious" | "blocked";
  warnings: string[];
  hostname: string;
}

function assess(url: string): RiskAssessment {
  let hostname = "";
  try { hostname = new URL(url).hostname; } catch {
    return { level: "blocked", warnings: ["Invalid URL"], hostname: "" };
  }

  const warnings: string[] = [];
  if (!isSafeProtocol(url)) warnings.push("Uses an unsafe protocol");
  if (hasEmbeddedCredentials(url)) warnings.push("Contains embedded credentials (phishing red flag)");
  if (isPunycodeHost(url)) warnings.push("Uses punycode/IDN — may impersonate a real domain");
  if (hasSuspiciousTld(url)) warnings.push("Domain uses a TLD frequently abused for phishing");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) warnings.push("Points to a raw IP address");
  if (url.length > 250) warnings.push("Unusually long URL");

  if (warnings.some(w => w.includes("unsafe") || w.includes("credentials"))) {
    return { level: "blocked", warnings, hostname };
  }
  if (isAllowedPartnerUrl(url) && warnings.length === 0) {
    return { level: "trusted", warnings, hostname };
  }
  if (warnings.length > 0) return { level: "suspicious", warnings, hostname };
  return { level: "neutral", warnings, hostname };
}

export default function ExternalLinkWarning({ url, open, onOpenChange, onConfirm }: Props) {
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);

  useEffect(() => {
    if (!url) { setAssessment(null); return; }
    setAssessment(assess(url));
  }, [url]);

  if (!url || !assessment) return null;

  const { level, warnings, hostname } = assessment;
  const blocked = level === "blocked";
  const trusted = level === "trusted";

  const tone =
    blocked ? "text-destructive"
    : level === "suspicious" ? "text-amber-600 dark:text-amber-400"
    : trusted ? "text-primary"
    : "text-muted-foreground";

  const Icon = blocked ? ShieldAlert : trusted ? CheckCircle2 : AlertTriangle;
  const heading = blocked
    ? "Link blocked for your safety"
    : trusted
      ? "Verified ZIVO partner link"
      : level === "suspicious"
        ? "Caution — this link looks suspicious"
        : "You're leaving ZIVO";

  const copyUrl = () => {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied"),
      () => toast.error("Couldn't copy"),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${tone}`}>
            <Icon className="h-5 w-5" /> {heading}
          </DialogTitle>
          <DialogDescription className="pt-1">
            {blocked
              ? "This link contains characteristics commonly used in scams or account takeover attempts. Opening it could put your account or device at risk."
              : "Always check the destination before entering passwords or payment info. ZIVO will never ask for your password on an external site."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="text-xs uppercase text-muted-foreground mb-1">Destination</div>
            <div className="font-mono text-sm break-all">{hostname || url}</div>
            <div className="font-mono text-[11px] text-muted-foreground break-all mt-1">{url}</div>
          </div>

          {warnings.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-1">
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase">
                Why we're warning you
              </div>
              <ul className="list-disc pl-5 text-sm text-amber-900 dark:text-amber-100 space-y-0.5">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {trusted && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
              This domain is on ZIVO's verified partner allowlist.
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Tip: never enter your ZIVO password, OTP, or wallet PIN on a site that isn't <span className="font-semibold">hizivo.com</span>.
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-col-reverse sm:flex-row">
          <Button variant="ghost" onClick={copyUrl} className="gap-1">
            <Copy className="h-4 w-4" /> Copy link
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {!blocked && (
            <Button onClick={() => { onConfirm(url); onOpenChange(false); }} className="gap-1">
              <ExternalLink className="h-4 w-4" /> Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
