import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft, Code2, Copy, Check, CheckCircle2, Plug, Plane, Hotel,
  TrendingUp, Link2, Search, Globe2, Sparkles, ShieldCheck,
} from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type PublishStatus = "live" | "draft";
type PreviewTheme = "light" | "dark";
type Niche = "flights" | "hotels" | "deals" | "blog";

const NICHES: { id: Niche; label: string; desc: string; icon: typeof Plane }[] = [
  { id: "flights", label: "Flight Deals", desc: "Live cheap flight cards", icon: Plane },
  { id: "hotels", label: "Hotel Picks", desc: "Top-rated stays widget", icon: Hotel },
  { id: "deals", label: "Mixed Deals", desc: "Flights + hotels combo", icon: Sparkles },
  { id: "blog", label: "Travel Blog", desc: "SEO articles auto-feed", icon: Globe2 },
];

const STORAGE_KEY = "zivo_connect_website_prefs";

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function savePrefs(patch: Record<string, unknown>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadPrefs(), ...patch })); }
  catch { /* non-critical */ }
}

const ConnectWebsitePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const prefs = loadPrefs();
  const [status, setStatus] = useState<PublishStatus>(prefs.status ?? "live");
  const [theme, setTheme] = useState<PreviewTheme>("light");
  const [connected, setConnected] = useState<boolean>(prefs.connected ?? true);
  const [niche, setNiche] = useState<Niche>(prefs.niche ?? "flights");
  const [dofollow, setDofollow] = useState<boolean>(prefs.dofollow ?? true);

  const userId = user?.id ?? null;
  const siteId = userId ? userId.replace(/-/g, "").slice(0, 24) : null;

  const snippet = siteId
    ? `<!-- ZIVO Travel Widget — SEO optimized -->
<div id="zivo-widget" data-niche="${niche}" data-rel="${dofollow ? "dofollow" : "nofollow"}"></div>
<script src="https://hizivo.com/api/embed/${siteId}.js" defer></script>
<noscript><a href="https://hizivo.com/?ref=${siteId}" rel="${dofollow ? "" : "nofollow "}noopener">Travel deals by ZIVO</a></noscript>`
    : "";

  const handleCopy = async () => {
    if (!snippet) {
      toast.error("Sign in to generate your real widget snippet");
      return;
    }
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Snippet copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    setConnected(false);
    savePrefs({ connected: false });
    toast.message("Widget disconnected", { description: "Your website will stop receiving updates." });
  };

  const handleReconnect = () => {
    setConnected(true);
    savePrefs({ connected: true });
    toast.success("Widget reconnected");
  };

  const handleNicheChange = (n: Niche) => {
    setNiche(n);
    savePrefs({ niche: n });
  };

  const handleDofollowToggle = () => {
    setDofollow((v) => {
      savePrefs({ dofollow: !v });
      return !v;
    });
  };

  const handleStatusChange = (s: PublishStatus) => {
    setStatus(s);
    savePrefs({ status: s });
  };

  return (
    <AppLayout hideHeader>
      <Helmet>
        <title>Connect Your Website — Free SEO Travel Widget | ZIVO</title>
        <meta
          name="description"
          content="Embed ZIVO's free travel widget on your site. Auto-updating flight & hotel deals, dofollow backlinks, schema-ready content — built for SEO traffic and AdSense."
        />
        <link rel="canonical" href="https://hizivo.com/connect-website" />
        <meta property="og:title" content="Free SEO Travel Widget for Your Website — ZIVO" />
        <meta
          property="og:description"
          content="One snippet. Auto-updating travel deals + indexable content + backlinks. Built to grow organic traffic."
        />
      </Helmet>
      <div className="min-h-screen bg-muted/20">
        {/* Top bar */}
        <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md pt-safe">
          <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Settings
            </Button>
          </div>
        </div>

        <div className="container max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_400px] gap-8">
          {/* Left: Setup */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Connect Your Website</h1>
                <Badge variant="secondary" className="rounded-full gap-1">
                  <Search className="w-3 h-3" /> SEO ready
                </Badge>
              </div>
              <p className="mt-2 text-muted-foreground">
                Add auto-updating travel content to any site. Indexable HTML, schema.org markup, and backlinks built in — designed to grow organic traffic.
              </p>
            </div>

            {/* SEO benefits */}
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: TrendingUp, label: "Fresh content daily", desc: "Auto-refreshed for SEO" },
                { icon: Link2, label: "Dofollow backlinks", desc: "Boosts your domain authority" },
                { icon: ShieldCheck, label: "Schema.org markup", desc: "Rich results in Google" },
              ].map((b) => (
                <Card key={b.label} className="p-3">
                  <b.icon className="w-4 h-4 text-primary mb-2" />
                  <div className="text-sm font-semibold">{b.label}</div>
                  <div className="text-xs text-muted-foreground">{b.desc}</div>
                </Card>
              ))}
            </div>

            {/* Niche picker */}
            <div>
              <h3 className="text-sm font-semibold mb-3">1. Pick your content niche</h3>
              <div className="grid grid-cols-2 gap-3">
                {NICHES.map((n) => (
                  <button type="button"
                    key={n.id}
                    onClick={() => handleNicheChange(n.id)}
                    className={cn(
                      "text-left p-3 rounded-xl border-2 transition-all flex gap-3 items-start",
                      niche === n.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <n.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{n.label}</div>
                      <div className="text-xs text-muted-foreground">{n.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dofollow toggle */}
            <Card className="p-4 flex items-start gap-3">
              <Link2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-sm">Dofollow backlink</div>
                  <button type="button"
                    onClick={handleDofollowToggle}
                    className={cn(
                      "h-6 w-11 rounded-full transition-colors relative shrink-0",
                      dofollow ? "bg-primary" : "bg-muted"
                    )}
                    aria-label="Toggle dofollow"
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 w-5 h-5 bg-background rounded-full shadow transition-transform",
                        dofollow ? "translate-x-5" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pass SEO link equity to ZIVO. Recommended for partner & affiliate sites.
                </p>
              </div>
            </Card>

            {/* Status banner */}
            <Card
              className={cn(
                "p-4 border-2 transition-colors",
                connected
                  ? "border-primary/30 bg-primary/5"
                  : "border-muted bg-muted/30"
              )}
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className={cn(
                    "w-5 h-5 mt-0.5 shrink-0",
                    connected ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <div>
                  <div className="font-semibold">
                    {connected ? "Active & indexed" : "Not connected"}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {connected
                      ? "Google can crawl your widget content. Sitemap auto-pinged on update."
                      : "Paste the snippet below to activate the widget."}
                  </p>
                </div>
              </div>
            </Card>

            {/* Code snippet */}
            <Card className="overflow-hidden">
              <div className="bg-foreground/[0.03] border-b border-border px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">embed snippet</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">HTML</span>
              </div>
              <pre className="p-4 text-xs sm:text-sm font-mono leading-relaxed overflow-x-auto bg-background">
                <code className="text-foreground">
                  {snippet || "Sign in to generate your real ZIVO widget snippet."}
                </code>
              </pre>
              <div className="p-3 border-t border-border">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  disabled={!snippet}
                  className="w-full justify-center gap-2 h-11"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy code"}
                </Button>
              </div>
            </Card>

            {/* Publish status */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Publish status</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <button type="button"
                  onClick={() => handleStatusChange("live")}
                  className={cn(
                    "text-left p-4 rounded-xl border-2 transition-all",
                    status === "live"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Publish to website</div>
                    {status === "live" && (
                      <Badge className="bg-primary/15 text-primary hover:bg-primary/15 rounded-full">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Goes live immediately</p>
                </button>

                <button type="button"
                  onClick={() => handleStatusChange("draft")}
                  className={cn(
                    "text-left p-4 rounded-xl border-2 transition-all",
                    status === "draft"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <div className="font-semibold">Save as Draft</div>
                  <p className="text-sm text-muted-foreground mt-1">Review before it goes live</p>
                </button>
              </div>
            </div>

            {/* Disconnect */}
            <Card className="p-1">
              {connected ? (
                <Button
                  onClick={handleDisconnect}
                  variant="ghost"
                  className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/5 gap-2"
                >
                  <Plug className="w-4 h-4" />
                  Disconnect
                </Button>
              ) : (
                <Button onClick={handleReconnect} className="w-full h-12 gap-2">
                  <Plug className="w-4 h-4" />
                  Reconnect widget
                </Button>
              )}
            </Card>
          </div>

          {/* Right: Live preview */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {/* Theme toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-full">
              {(["light", "dark"] as const).map((t) => (
                <button type="button"
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "h-9 rounded-full text-sm font-medium capitalize transition-all flex items-center justify-center gap-2",
                    theme === t ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      t === "light" ? "bg-amber-400" : "bg-foreground"
                    )}
                  />
                  {t}
                </button>
              ))}
            </div>

            {/* Widget preview */}
            <Card className="overflow-hidden shadow-xl">
              <div className="bg-muted px-3 py-2 flex items-center gap-2 border-b border-border">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-primary/50" />
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                </div>
                <div className="flex-1 mx-2 px-3 py-1 bg-background rounded-md text-xs text-muted-foreground text-center">
                  yourwebsite.com/travel
                </div>
              </div>

              <div
                className={cn(
                  "p-4 space-y-3 transition-colors",
                  theme === "dark" ? "bg-foreground" : "bg-background"
                )}
              >
                <div
                  className={cn(
                    "flex gap-3 p-3 rounded-xl",
                    theme === "dark" ? "bg-background/10" : "bg-muted/40"
                  )}
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 bg-primary/15">
                    {niche === "hotels" ? (
                      <Hotel className="w-5 h-5 text-primary" />
                    ) : (
                      <Plane className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "font-semibold text-sm",
                        theme === "dark" ? "text-background" : "text-foreground"
                      )}
                    >
                      Live widget content
                    </div>
                    <div
                      className={cn(
                        "text-xs mt-0.5 leading-5",
                        !connected
                          ? "text-primary"
                          : theme === "dark"
                          ? "text-background/60"
                          : "text-muted-foreground"
                      )}
                    >
                      {connected
                        ? "Your site will render real ZIVO inventory and affiliate offers from the live widget feed."
                        : "Draft mode keeps the widget hidden until you publish it."}
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "text-[10px] text-center pt-2",
                    theme === "dark" ? "text-background/50" : "text-muted-foreground"
                  )}
                >
                  Powered by ZIVO
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ConnectWebsitePage;
