import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import SafeCaption from "@/components/social/SafeCaption";
import { assessLinkSync } from "@/hooks/useLinkRisk";
import { confirmContentSafe } from "@/lib/security/contentLinkValidation";

const SAMPLE_LINKS = [
  { label: "Real ZIVO domain", url: "https://hizivo.com/login" },
  { label: "Verified partner", url: "https://booking.com/hotel/abc" },
  { label: "URL shortener (suspicious)", url: "https://bit.ly/free-prize" },
  { label: "Suspicious TLD", url: "https://promo.zip/" },
  { label: "Punycode lookalike (xn--apple)", url: "https://xn--pple-43d.com/login" },
  { label: "ZIVO typosquat (h1zivo)", url: "https://h1zivo.com/login" },
  { label: "ZIVO typosquat (hizovo)", url: "https://hizovo.com/" },
  { label: "Embedded credentials", url: "https://admin:pwd@evil.com/" },
  { label: "Raw IP address", url: "http://192.168.1.1/admin" },
];

const LEVEL_STYLES: Record<string, string> = {
  trusted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30",
  neutral: "bg-muted text-muted-foreground ring-border",
  suspicious: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/30",
  blocked: "bg-destructive/10 text-destructive ring-destructive/30",
};

const LEVEL_ICONS: Record<string, typeof ShieldCheck> = {
  trusted: ShieldCheck,
  neutral: CheckCircle2,
  suspicious: AlertTriangle,
  blocked: ShieldAlert,
};

export default function SecurityTestPage() {
  const [customUrl, setCustomUrl] = useState("");
  const [draft, setDraft] = useState("Hey check this out: https://h1zivo.com/login");

  const customRisk = useMemo(() => {
    if (!customUrl.trim()) return null;
    try {
      new URL(customUrl);
      return assessLinkSync(customUrl);
    } catch {
      return { level: "blocked" as const, warnings: ["Invalid URL"] };
    }
  }, [customUrl]);

  const handleSubmit = () => {
    if (!confirmContentSafe(draft, "test content")) return;
    // No-op success — the toast fires automatically.
  };

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 pb-24 sm:space-y-4 sm:p-4 lg:p-6">
      <header className="space-y-1">
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="h-3.5 w-3.5" /> Security verification
        </Badge>
        <h1 className="text-xl font-bold sm:text-2xl">Anti-phishing & link-safety demo</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Live demonstration of every link-safety rule. Each sample below is
          assessed by the same code that protects every post, comment, bio,
          review, ride feedback, support ticket, and chat in the app.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sample link assessments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {SAMPLE_LINKS.map((sample) => {
            const risk = assessLinkSync(sample.url);
            const Icon = LEVEL_ICONS[risk.level] ?? CheckCircle2;
            return (
              <div
                key={sample.url}
                className={`rounded-lg p-2.5 ring-1 sm:p-3 ${LEVEL_STYLES[risk.level]}`}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80 sm:text-xs">
                      {sample.label}
                    </p>
                    <p className="mt-0.5 break-all font-mono text-[10px] sm:text-[11px]">
                      {sample.url}
                    </p>
                    {risk.warnings.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-[10px] sm:text-[11px]">
                        {risk.warnings.map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 gap-1 text-[10px] sm:text-xs">
                    <Icon className="h-3 w-3" /> {risk.level}
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test your own URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://example.com"
          />
          {customRisk && (
            <div className={`rounded-lg p-3 ring-1 ${LEVEL_STYLES[customRisk.level]}`}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  {customRisk.level}
                </Badge>
                {customRisk.warnings.map((w, i) => (
                  <span key={i} className="text-xs">{w}</span>
                ))}
                {customRisk.warnings.length === 0 && (
                  <span className="text-xs text-muted-foreground">No warnings.</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live render-time protection (SafeCaption)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed">
            <SafeCaption text="Hey, real partner: https://booking.com/x — but check this typosquat https://h1zivo.com/login or this shortener https://bit.ly/test or this clean post about #travel by @zivo." />
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Click each link: trusted opens directly, suspicious opens an
            interstitial warning, blocked is struck through and
            non-clickable. Hashtags route to /explore?tag=…, mentions resolve
            via the usernames table.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live write-time protection (confirmContentSafe)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button onClick={handleSubmit} className="w-full">
            Submit (toast tells you what happens)
          </Button>
          <p className="text-xs text-muted-foreground">
            This is the same gate used on post submit, comment submit, bio
            save, review submit, support ticket submit, refund dispute,
            ride feedback, lost-item report, and community creation.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
