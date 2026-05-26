/**
 * SupplierBrowserModal
 *
 * Two modes depending on the supplier:
 *
 * 1. EMBED mode (default) — loads the portal in an <iframe src={proxyUrl}>.
 *    The proxy injects a script that spoofs window.location / history and rewrites
 *    fetch/XHR so the SPA stays inside the modal. Sends "zivo-proxy-ready" when ready.
 *    Falls back to credential-launcher mode on timeout / error.
 *
 * 2. CREDENTIAL-LAUNCHER mode (supplier.skipEmbed = true, or after embed fails) —
 *    Shows the portal credentials with one-click copy, opens the real site in a new
 *    tab, and walks the user through pasting username then password.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import KeyRound from "lucide-react/dist/esm/icons/key-round";
import ShieldAlert from "lucide-react/dist/esm/icons/shield-alert";
import Eye from "lucide-react/dist/esm/icons/eye";
import EyeOff from "lucide-react/dist/esm/icons/eye-off";
import Copy from "lucide-react/dist/esm/icons/copy";
import Check from "lucide-react/dist/esm/icons/check";
import Wand2 from "lucide-react/dist/esm/icons/wand-2";
import Info from "lucide-react/dist/esm/icons/info";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import Search from "lucide-react/dist/esm/icons/search";
import Globe from "lucide-react/dist/esm/icons/globe";
import LogIn from "lucide-react/dist/esm/icons/log-in";
import PartsSupplierLogo from "./PartsSupplierLogo";
import { type PartsSupplier, getSupplierSearchUrl } from "@/config/partsSuppliers";

interface Props {
  storeId: string;
  supplier: PartsSupplier | null;
  query?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SavedCreds = { email: string; password: string; updatedAt: string };
type LoadState = "loading" | "ready" | "failed";
type LaunchStep = "idle" | "tab_opened";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PROXY_BASE = `${SUPABASE_URL}/functions/v1/supplier-proxy?u=`;
const LOAD_TIMEOUT_MS = 8_000;

const credKey = (storeId: string, supplierId: string) =>
  `zivo.supplierCreds.${storeId}.${supplierId}`;

function loadCreds(storeId: string, supplierId: string): SavedCreds | null {
  try { const r = localStorage.getItem(credKey(storeId, supplierId)); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function saveCreds(storeId: string, supplierId: string, c: SavedCreds) {
  localStorage.setItem(credKey(storeId, supplierId), JSON.stringify(c));
}
function clearCreds(storeId: string, supplierId: string) {
  localStorage.removeItem(credKey(storeId, supplierId));
}

/** Fetch the proxied HTML as JSON and create a local blob URL.
 *  Supabase/Cloudflare overrides text/html content-type → text/plain and adds
 *  a sandbox CSP, breaking script execution.  Fetching as JSON bypasses this:
 *  the browser creates a same-origin blob URL (localhost) so no CSP applies. */
async function fetchBlobUrl(
  proxyUrl: string,
  method = "GET",
  body?: string,
  contentType?: string,
): Promise<string> {
  const sep = proxyUrl.includes("?") ? "&" : "?";
  const jsonUrl = `${proxyUrl}${sep}format=json`;
  const res = await fetch(jsonUrl, {
    method,
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body: method !== "GET" ? body : undefined,
  });
  if (!res.ok) throw new Error(`Proxy ${res.status}`);
  const { html } = await res.json() as { html: string };
  const blob = new Blob([html], { type: "text/html" });
  return URL.createObjectURL(blob);
}

export default function SupplierBrowserModal({ storeId, supplier, query, open, onOpenChange }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Embed state
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [frameKey, setFrameKey] = useState(0);

  // Revoke blob URL on unmount to prevent memory leaks
  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);

  // Creds
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);
  const [showCreds, setShowCreds] = useState(false);
  const [editCreds, setEditCreds] = useState(false);
  const [saved, setSaved] = useState<SavedCreds | null>(null);

  // Launcher mode state
  const [launchStep, setLaunchStep] = useState<LaunchStep>("idle");

  // Search
  const [searchQ, setSearchQ] = useState(query ?? "");

  const isSkipEmbed = !!supplier?.skipEmbed;

  const targetUrl = useMemo(() => {
    if (!supplier?.domain) return null;
    return (searchQ && getSupplierSearchUrl(supplier, searchQ))
      || supplier.portalUrl
      || `https://${supplier.domain}`;
  }, [supplier, searchQ]);

  const proxiedUrl = useMemo(() =>
    targetUrl ? `${PROXY_BASE}${encodeURIComponent(targetUrl)}` : null,
    [targetUrl]
  );

  // Reset when supplier / open changes
  useEffect(() => {
    if (!open || !supplier) return;
    const existing = loadCreds(storeId, supplier.id);
    setSaved(existing);
    setEmail(existing?.email ?? "");
    setPassword(existing?.password ?? "");
    setShowPwd(false);
    setShowCreds(!!existing);
    setEditCreds(!existing);
    setSearchQ(query ?? "");
    setLaunchStep("idle");

    if (isSkipEmbed) {
      setLoadState("failed");
      setIframeSrc(null);
    } else if (proxiedUrl) {
      setLoadState("loading");
      // Use blob URL to bypass Supabase's text/html → text/plain override + sandbox CSP
      fetchBlobUrl(proxiedUrl).then(blob => {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = blob;
        setIframeSrc(blob);
        setFrameKey(k => k + 1);
      }).catch(() => setLoadState("failed"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supplier, storeId]);

  const navigateTo = useCallback((proxyUrl: string, method = "GET", body?: string, contentType?: string) => {
    if (isSkipEmbed) return;
    setLoadState("loading");
    fetchBlobUrl(proxyUrl, method, body, contentType).then(blob => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = blob;
      setIframeSrc(blob);
      setFrameKey(k => k + 1);
    }).catch(() => setLoadState("failed"));
  }, [isSkipEmbed]);

  // Listen for messages from proxy page
  useEffect(() => {
    if (!open || isSkipEmbed) return;
    const handler = (ev: MessageEvent) => {
      const d = ev.data as { type?: string; url?: string; method?: string; body?: string; contentType?: string; filled?: boolean };
      if (d?.type === "zivo-proxy-ready") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setLoadState("ready");
        const win = iframeRef.current?.contentWindow;
        if (win && (email || password)) {
          setTimeout(() => win.postMessage({ type: "zivo-autofill", username: email, password, autoSubmit: true }, "*"), 400);
        }
        return;
      }
      if (d?.type === "zivo-autofill-result") {
        if (d.filled) toast.success("Credentials filled in form");
        return;
      }
      if (d?.type === "zivo-supplier-navigate" && d.url) {
        try {
          const next = new URL(d.url);
          const allowed = new URL(`${SUPABASE_URL}/functions/v1/supplier-proxy`);
          if (next.host !== allowed.host || !next.pathname.includes("supplier-proxy")) return;
        } catch { return; }
        navigateTo(d.url, d.method ?? "GET", d.body, d.contentType);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [open, isSkipEmbed, email, password]);

  // Timeout for failed load
  useEffect(() => {
    if (isSkipEmbed || loadState !== "loading" || !iframeSrc) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setLoadState("failed"), LOAD_TIMEOUT_MS);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [iframeSrc, loadState, isSkipEmbed]);

  if (!supplier) return null;

  const consumerUrl = supplier.consumerDomain ? `https://${supplier.consumerDomain}` : null;
  const displayName = supplier.shortName ?? supplier.name;

  const handleSaveCreds = () => {
    if (!email.trim()) { toast.error("Email is required"); return; }
    const c: SavedCreds = { email: email.trim(), password, updatedAt: new Date().toISOString() };
    saveCreds(storeId, supplier.id, c);
    setSaved(c);
    setEditCreds(false);
    toast.success("Account saved on this device");
    const win = iframeRef.current?.contentWindow;
    if (win && loadState === "ready") {
      setTimeout(() => win.postMessage({ type: "zivo-autofill", username: email, password, autoSubmit: true }, "*"), 200);
    }
  };

  const handleClearCreds = () => {
    clearCreds(storeId, supplier.id);
    setSaved(null); setEmail(""); setPassword("");
    setEditCreds(true);
    toast.success("Account removed");
  };

  const copyToClipboard = async (value: string, kind: "email" | "password") => {
    if (!value) return;
    try { await navigator.clipboard.writeText(value); setCopied(kind); setTimeout(() => setCopied(null), 2000); }
    catch { toast.error("Could not copy"); }
  };

  const sendAutofill = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win || loadState !== "ready") { toast.error("Portal not ready yet"); return; }
    win.postMessage({ type: "zivo-autofill", username: email, password, autoSubmit: true }, "*");
  };

  const reload = () => {
    if (!proxiedUrl) return;
    setLoadState("loading");
    fetchBlobUrl(proxiedUrl).then(blob => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = blob;
      setIframeSrc(blob);
      setFrameKey(k => k + 1);
    }).catch(() => setLoadState("failed"));
  };

  // Open tab AND copy username automatically
  const launchAndCopyUsername = async () => {
    if (targetUrl) window.open(targetUrl, "_blank", "noopener,noreferrer");
    if (email) {
      await copyToClipboard(email, "email");
      toast.success(`Tab opened — username "${email}" copied! Paste it in the login field.`);
    }
    setLaunchStep("tab_opened");
  };

  const openNewTab = () => targetUrl && window.open(targetUrl, "_blank", "noopener,noreferrer");

  // ──────────────────────────────────────────────
  // CREDENTIAL LAUNCHER (skipEmbed or failed embed)
  // ──────────────────────────────────────────────
  const credentialLauncher = (
    <div className="flex-1 overflow-y-auto p-6 flex items-start justify-center">
      <div className="w-full max-w-lg space-y-5">

        {/* Hero */}
        <div className="text-center space-y-2">
          <PartsSupplierLogo supplier={supplier} size="lg" className="mx-auto" />
          <h2 className="text-base font-bold">{supplier.name}</h2>
          <p className="text-xs text-muted-foreground">{supplier.domain} · {supplier.category}</p>
        </div>

        {/* Credential form */}
        <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Your {displayName} account</p>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
            <p>Stored on this device only. Click <strong>Launch &amp; Log In</strong> to open {displayName} — your username will be copied automatically.</p>
          </div>

          {supplier.loginFlow === "two-step" && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 px-3 py-2">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 dark:text-amber-200">
                <strong>2-step login:</strong> paste username → Continue → come back here and copy password → paste it.
              </p>
            </div>
          )}

          <div className="space-y-2.5">
            <div className="space-y-1">
              <Label className="text-[11px]">Email / username</Label>
              <div className="flex gap-1.5">
                <Input
                  className="h-9 text-sm flex-1"
                  type={editCreds ? "email" : "text"}
                  autoComplete="off"
                  readOnly={!editCreds}
                  placeholder={`your@${supplier.domain ?? "email.com"}`}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <Button
                  size="sm" variant="outline" className="h-9 w-9 p-0 shrink-0"
                  onClick={() => { copyToClipboard(email, "email"); toast.success("Username copied!"); }}
                  disabled={!email}
                  title="Copy username"
                >
                  {copied === "email" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Password</Label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Input
                    className="h-9 text-sm pr-9"
                    type={showPwd ? "text" : "password"}
                    autoComplete="new-password"
                    readOnly={!editCreds}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  size="sm"
                  variant={launchStep === "tab_opened" ? "default" : "outline"}
                  className={`h-9 w-9 p-0 shrink-0 ${launchStep === "tab_opened" ? "animate-pulse" : ""}`}
                  onClick={() => { copyToClipboard(password, "password"); toast.success("Password copied! Paste it in the portal."); }}
                  disabled={!password}
                  title="Copy password"
                >
                  {copied === "password" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              {launchStep === "tab_opened" && password && (
                <p className="text-[11px] text-primary font-medium animate-pulse">
                  ↑ Click the copy button above to copy your password
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {saved && !editCreds ? (
              <>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditCreds(true)}>Edit</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={handleClearCreds}>Remove</Button>
              </>
            ) : (
              <>
                {saved && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditCreds(false)}>Cancel</Button>}
                <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleSaveCreds}>
                  <KeyRound className="w-3.5 h-3.5" /> Save account
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Launch button */}
        <div className="space-y-2">
          {launchStep === "idle" ? (
            <Button
              size="lg"
              className="w-full gap-2 text-sm h-12"
              onClick={launchAndCopyUsername}
            >
              <LogIn className="w-4 h-4" />
              {email ? `Launch ${displayName} & copy username` : `Open ${displayName} in new tab`}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700 px-4 py-3">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Tab opened — username copied!</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Paste it in {displayName}'s login field{supplier.loginFlow === "two-step" ? ", click Continue, then come back and copy your password." : ", then copy your password below."}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full gap-2 h-9 text-xs" onClick={openNewTab}>
                <ExternalLink className="w-3.5 h-3.5" /> Open {displayName} again
              </Button>
            </div>
          )}

          {consumerUrl && (
            <Button variant="ghost" size="sm" className="w-full gap-2 h-8 text-xs text-muted-foreground" onClick={() => window.open(consumerUrl, "_blank", "noopener,noreferrer")}>
              <Globe className="w-3.5 h-3.5" /> Open consumer site ({supplier.consumerDomain})
            </Button>
          )}
        </div>

        {/* Search */}
        {supplier.searchUrlTemplate && (
          <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Search a part directly</p>
            <div className="flex gap-2">
              <Input
                className="h-8 text-xs flex-1"
                placeholder={`Search on ${displayName}…`}
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && searchQ.trim()) {
                    const url = getSupplierSearchUrl(supplier, searchQ.trim());
                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                  }
                }}
              />
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs shrink-0"
                onClick={() => { const url = getSupplierSearchUrl(supplier, searchQ.trim()); if (url) window.open(url, "_blank", "noopener,noreferrer"); }}>
                <Search className="w-3.5 h-3.5" /> Search
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ──────────────────────────────────────────────
  // EMBED MODE — full iframe
  // ──────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`p-0 overflow-hidden flex flex-col gap-0 ${isSkipEmbed || loadState === "failed" ? "max-w-lg w-[95vw]" : "max-w-6xl w-[98vw] h-[92vh]"}`}>

        {/* Top bar */}
        <DialogHeader className="px-4 py-2.5 border-b bg-card shrink-0">
          <DialogTitle className="flex items-center gap-2.5 flex-wrap">
            <PartsSupplierLogo supplier={supplier} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{supplier.name}</p>
              <p className="text-[10px] text-muted-foreground">{supplier.domain} · {supplier.category}</p>
            </div>

            {!isSkipEmbed && (
              <>
                {loadState === "loading" && (
                  <Badge variant="outline" className="gap-1 text-[10px]"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</Badge>
                )}
                {loadState === "ready" && (
                  <Badge variant="outline" className="gap-1 text-[10px] border-emerald-400 text-emerald-600"><Check className="w-3 h-3" /> Live</Badge>
                )}
                {loadState === "failed" && (
                  <Badge variant="outline" className="gap-1 text-[10px] border-amber-400 text-amber-600"><AlertCircle className="w-3 h-3" /> Blocked</Badge>
                )}
                {(email || password) && loadState === "ready" && (
                  <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={sendAutofill}>
                    <Wand2 className="w-3.5 h-3.5" /> Auto-fill login
                  </Button>
                )}
                {!isSkipEmbed && loadState !== "failed" && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setShowCreds(s => !s)}>
                      <KeyRound className="w-3.5 h-3.5" /> Account
                      {showCreds ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={reload} title="Reload">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </>
            )}

            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={openNewTab}>
              <ExternalLink className="w-3.5 h-3.5" /> New tab
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Credential panel for embed mode */}
        {!isSkipEmbed && showCreds && loadState !== "failed" && (
          <div className="px-4 py-3 border-b bg-muted/20 shrink-0 space-y-2.5">
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
              <p>Credentials stored <strong>on this device only</strong>. Click <strong>Auto-fill login</strong> after the portal loads.</p>
            </div>
            {supplier.loginFlow === "two-step" && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 px-3 py-2">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 dark:text-amber-200">
                  <strong>2-step login:</strong> enter email → click Continue → then click Auto-fill again for the password screen.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Email / username</Label>
                <div className="flex gap-1.5">
                  <Input className="h-8 text-xs flex-1" type={editCreds ? "email" : "text"} autoComplete="off"
                    readOnly={!editCreds} placeholder={`your@${supplier.domain ?? "email.com"}`}
                    value={email} onChange={e => setEmail(e.target.value)} />
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0" onClick={() => copyToClipboard(email, "email")} disabled={!email}>
                    {copied === "email" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Password</Label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Input className="h-8 text-xs pr-8" type={showPwd ? "text" : "password"} autoComplete="new-password"
                      readOnly={!editCreds} placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowPwd(s => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0" onClick={() => copyToClipboard(password, "password")} disabled={!password}>
                    {copied === "password" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              {saved && !editCreds ? (
                <>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditCreds(true)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={handleClearCreds}>Remove</Button>
                </>
              ) : (
                <>
                  {saved && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditCreds(false)}>Cancel</Button>}
                  <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleSaveCreds}>
                    <KeyRound className="w-3.5 h-3.5" /> Save &amp; auto-fill
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Search bar (embed mode only) */}
        {!isSkipEmbed && supplier.searchUrlTemplate && loadState !== "failed" && (
          <div className="px-4 py-2 border-b bg-muted/10 shrink-0 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              placeholder={`Search on ${displayName}…`}
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && searchQ.trim()) {
                  const url = getSupplierSearchUrl(supplier, searchQ.trim());
                  if (url) navigateTo(`${PROXY_BASE}${encodeURIComponent(url)}`);
                }
              }}
            />
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs shrink-0"
              onClick={() => { const url = getSupplierSearchUrl(supplier, searchQ.trim()); if (url) navigateTo(`${PROXY_BASE}${encodeURIComponent(url)}`); }}>
              <Search className="w-3.5 h-3.5" /> Search
            </Button>
            {consumerUrl && (
              <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs shrink-0" onClick={() => window.open(consumerUrl, "_blank", "noopener,noreferrer")}>
                <Globe className="w-3.5 h-3.5" /> Consumer site
              </Button>
            )}
          </div>
        )}

        {/* Main content */}
        {isSkipEmbed || loadState === "failed" ? (
          credentialLauncher
        ) : (
          <div className="flex-1 relative min-h-0 bg-muted/10">
            {loadState === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10 pointer-events-none">
                <div className="flex flex-col items-center gap-3 bg-background border rounded-2xl px-8 py-6 shadow-lg">
                  <PartsSupplierLogo supplier={supplier} size="lg" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading {displayName}…
                  </div>
                  <p className="text-[11px] text-muted-foreground max-w-[240px] text-center">
                    Connecting through the secure proxy. This may take a few seconds.
                  </p>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs mt-1" onClick={() => setLoadState("failed")}>
                    Skip — show options
                  </Button>
                </div>
              </div>
            )}

            {iframeSrc && (
              <iframe
                key={frameKey}
                ref={iframeRef}
                src={iframeSrc}
                title={supplier.name}
                className="absolute inset-0 w-full h-full bg-white border-none"
                sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation allow-downloads"
                referrerPolicy="no-referrer"
                onError={() => setLoadState("failed")}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
