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
import { copyText } from "@/lib/native/clipboard";
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
import PlusCircle from "lucide-react/dist/esm/icons/plus-circle";
import PartsSupplierLogo from "./PartsSupplierLogo";
import { type PartsSupplier, getSupplierSearchUrl } from "@/config/partsSuppliers";
import { SUPABASE_URL, supabase } from "@/integrations/supabase/client";

/** A part the user captured from a supplier portal, to drop onto the R.O. as a line. */
export type CapturedPart = { description: string; sku: string; brand: string; price: number; qty: number };

interface Props {
  storeId: string;
  supplier: PartsSupplier | null;
  query?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, shows an "Add part to R.O." capture bar that feeds the open R.O. */
  onAddPart?: (p: CapturedPart) => void;
}

type SavedCreds = { email: string; password: string; updatedAt: string };
type LoadState = "loading" | "ready" | "failed";
type LaunchStep = "idle" | "tab_opened";

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

// ── Backend sync (ar_supplier_credentials) ─────────────────────────────────
// Credentials live in the DB (RLS-locked to the store) so they're shared across
// every device/staff member in the shop. localStorage above stays as an offline
// cache for instant paint; the DB is the source of truth.
async function fetchCredsRemote(storeId: string, supplierId: string): Promise<SavedCreds | null> {
  try {
    const { data, error } = await supabase
      .from("ar_supplier_credentials" as any)
      .select("email,password,updated_at")
      .eq("store_id", storeId)
      .eq("supplier_id", supplierId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as unknown as { email: string | null; password: string | null; updated_at: string | null };
    return { email: row.email ?? "", password: row.password ?? "", updatedAt: row.updated_at ?? "" };
  } catch { return null; }
}
async function saveCredsRemote(storeId: string, supplierId: string, c: SavedCreds): Promise<void> {
  try {
    await supabase.from("ar_supplier_credentials" as any).upsert(
      { store_id: storeId, supplier_id: supplierId, email: c.email, password: c.password, updated_at: c.updatedAt },
      { onConflict: "store_id,supplier_id" },
    );
  } catch { /* offline / RLS — localStorage cache still holds it */ }
}
async function clearCredsRemote(storeId: string, supplierId: string): Promise<void> {
  try {
    await supabase.from("ar_supplier_credentials" as any).delete().eq("store_id", storeId).eq("supplier_id", supplierId);
  } catch { /* ignore */ }
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

export default function SupplierBrowserModal({ storeId, supplier, query, open, onOpenChange, onAddPart }: Props) {
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

  // Set when the embedded portal appears to have blocked the in-app login
  // (e.g. Akamai/Cloudflare bot wall). Drives a "log in via new tab" nudge.
  const [loginBlocked, setLoginBlocked] = useState(false);

  // Search
  const [searchQ, setSearchQ] = useState(query ?? "");

  // "Add part to R.O." capture form (shown when onAddPart is provided)
  const [partDesc, setPartDesc] = useState("");
  const [partSku, setPartSku] = useState("");
  const [partPrice, setPartPrice] = useState("");
  const [partQty, setPartQty] = useState("1");

  const isSkipEmbed = !!supplier?.skipEmbed;

  const portalUrl = useMemo(() => {
    if (!supplier) return null;
    return supplier.portalUrl || (supplier.domain ? `https://${supplier.domain}` : null);
  }, [supplier]);

  const targetUrl = useMemo(() => {
    if (!supplier) return null;
    const searchUrl = searchQ.trim() ? getSupplierSearchUrl(supplier, searchQ.trim()) : null;
    return searchUrl || portalUrl;
  }, [supplier, searchQ, portalUrl]);

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
    setLoginBlocked(false);

    // Pull the shared copy from the backend. If present it wins over the local
    // cache (another device may have updated it) and refreshes the cache.
    let cancelled = false;
    fetchCredsRemote(storeId, supplier.id).then((remote) => {
      if (cancelled || !remote?.email) return;
      saveCreds(storeId, supplier.id, remote);
      setSaved(remote);
      setEmail(remote.email);
      setPassword(remote.password);
      setShowCreds(true);
      setEditCreds(false);
    });

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
    return () => { cancelled = true; };
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
  }, [open, isSkipEmbed, email, password, navigateTo]);

  // Timeout for failed load
  useEffect(() => {
    if (isSkipEmbed || loadState !== "loading" || !iframeSrc) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setLoadState("failed"), LOAD_TIMEOUT_MS);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [iframeSrc, loadState, isSkipEmbed]);

  // Bot-wall / error detection. Many supplier portals (Akamai/Cloudflare) let the
  // page load but block the actual login, showing a generic error. We poll the
  // embedded doc (same-origin blob, so readable) for those markers and nudge the
  // user to finish login in a real browser tab where the portal trusts the session.
  useEffect(() => {
    if (isSkipEmbed || loadState !== "ready") return;
    const MARKERS = [
      "technical issues", "access denied", "pardon the interruption",
      "unusual traffic", "unusual activity", "request unsuccessful",
      "reference #", "verify you are a human", "are you a robot",
      "couldn't complete your request", "could not complete your request",
    ];
    const check = () => {
      try {
        const doc = iframeRef.current?.contentDocument;
        const text = (doc?.body?.innerText || "").toLowerCase();
        if (text && MARKERS.some(m => text.includes(m))) setLoginBlocked(true);
      } catch { /* cross-origin / not ready — ignore */ }
    };
    check();
    const id = setInterval(check, 1500);
    return () => clearInterval(id);
  }, [loadState, isSkipEmbed, frameKey]);

  if (!supplier) return null;

  const consumerUrl = supplier.consumerDomain ? `https://${supplier.consumerDomain}` : null;
  const displayName = supplier.shortName ?? supplier.name;

  const handleSaveCreds = () => {
    if (!email.trim()) { toast.error("Email is required"); return; }
    const c: SavedCreds = { email: email.trim(), password, updatedAt: new Date().toISOString() };
    saveCreds(storeId, supplier.id, c);
    void saveCredsRemote(storeId, supplier.id, c);
    setSaved(c);
    setEditCreds(false);
    toast.success("Account saved for the shop");
    const win = iframeRef.current?.contentWindow;
    if (win && loadState === "ready") {
      setTimeout(() => win.postMessage({ type: "zivo-autofill", username: email, password, autoSubmit: true }, "*"), 200);
    }
  };

  const handleClearCreds = () => {
    clearCreds(storeId, supplier.id);
    void clearCredsRemote(storeId, supplier.id);
    setSaved(null); setEmail(""); setPassword("");
    setEditCreds(true);
    toast.success("Account removed for the shop");
  };

  const copyToClipboard = async (value: string, kind: "email" | "password") => {
    if (!value) return false;
    try {
      await copyText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
      return true;
    } catch {
      toast.error("Could not copy");
      return false;
    }
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

  const signInUrl = portalUrl || targetUrl || "#";

  const openWindow = (url: string) => {
    try {
      const opened = window.open(url, "_blank");
      if (opened) {
        opened.opener = null;
        return true;
      }
    } catch {
      // Fall through to same-tab navigation below.
    }
    return false;
  };

  const openInCurrentTab = (url: string) => {
    if (url && url !== "#") window.location.assign(url);
  };

  // Copy username, then send blocked suppliers to a real sign-in page.
  const launchAndCopyUsername = async () => {
    const opened = isSkipEmbed ? false : openWindow(signInUrl);
    if (email) {
      const didCopy = await copyToClipboard(email, "email");
      toast.success(didCopy
        ? "Sign-in page opened - username copied. Paste it in the login field."
        : "Sign-in page opened. Use the copy button if the username did not copy."
      );
    } else {
      toast.success("Sign-in page opened.");
    }
    setLaunchStep("tab_opened");
    if (!opened) openInCurrentTab(signInUrl);
  };

  const openNewTab = () => targetUrl && window.open(targetUrl, "_blank", "noopener,noreferrer");
  const openLoginTab = () => {
    const url = portalUrl || targetUrl;
    if (!url) return;
    if (isSkipEmbed || !openWindow(url)) openInCurrentTab(url);
  };

  // Open the real portal in a new tab and copy the username if we have one — used
  // by the "blocked login" nudge so the user can finish signing in where it works.
  const openNewTabWithUsername = async () => {
    const url = portalUrl || targetUrl;
    if (!url) return;
    const opened = isSkipEmbed ? false : openWindow(url);
    if (email) {
      const didCopy = await copyToClipboard(email, "email");
      toast.success(didCopy
        ? `Opened ${displayName} sign-in - username copied. Paste it to sign in.`
        : `Opened ${displayName} sign-in. Use the copy button if the username did not copy.`
      );
    } else {
      toast.success(`Opened ${displayName} sign-in.`);
    }
    if (!opened) openInCurrentTab(url);
  };

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddPart || !supplier) return;
    const desc = partDesc.trim();
    if (!desc) { toast.error("Enter the part description first"); return; }
    onAddPart({
      description: desc,
      sku: partSku.trim(),
      brand: supplier.shortName ?? supplier.name,
      price: Number(partPrice) || 0,
      qty: Math.max(1, Number(partQty) || 1),
    });
    setPartDesc(""); setPartSku(""); setPartPrice(""); setPartQty("1");
  };

  // Slim capture bar: type what you found on the portal and it lands on the R.O.
  const addPartBar = onAddPart ? (
    <form onSubmit={handleAddPart} className="shrink-0 border-t bg-card px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <PlusCircle className="h-4 w-4" /> Add to R.O.
        </span>
        <Input
          className="h-8 text-xs flex-1 min-w-[160px]"
          placeholder={`Part found on ${displayName}…`}
          value={partDesc}
          onChange={(e) => setPartDesc(e.target.value)}
        />
        <Input
          className="h-8 text-xs w-28"
          placeholder="Part #"
          value={partSku}
          onChange={(e) => setPartSku(e.target.value)}
        />
        <div className="relative w-24">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
          <Input
            className="h-8 text-xs pl-5"
            type="number" min="0" step="0.01" inputMode="decimal"
            placeholder="Price"
            value={partPrice}
            onChange={(e) => setPartPrice(e.target.value)}
          />
        </div>
        <Input
          className="h-8 text-xs w-16"
          type="number" min="1" step="1" inputMode="numeric"
          placeholder="Qty"
          value={partQty}
          onChange={(e) => setPartQty(e.target.value)}
        />
        <Button type="submit" size="sm" className="h-8 gap-1.5 text-xs shrink-0" disabled={!partDesc.trim()}>
          <PlusCircle className="h-3.5 w-3.5" /> Add line
        </Button>
      </div>
    </form>
  ) : null;

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
            <p>Stored on this device only. {displayName} blocks embedded sign-in, so open its secure login tab and use the copy buttons here.</p>
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
                  onClick={async () => {
                    if (await copyToClipboard(email, "email")) toast.success("Username copied!");
                  }}
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
                  onClick={async () => {
                    if (await copyToClipboard(password, "password")) toast.success("Password copied! Paste it in the portal.");
                  }}
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
              <ExternalLink className="w-4 h-4" />
              {email ? `Go to ${displayName} login & copy username` : `Go to ${displayName} login`}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700 px-4 py-3">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Sign-in page opened</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Paste it in {displayName}'s login field{supplier.loginFlow === "two-step" ? ", click Continue, then come back and copy your password." : ", then copy your password below."}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full gap-2 h-9 text-xs" onClick={openLoginTab}>
                <ExternalLink className="w-3.5 h-3.5" /> Go to {displayName} sign-in
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

            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={isSkipEmbed ? openLoginTab : openNewTab}>
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

            {/* Blocked-login nudge — the portal loaded but won't let us sign in in-frame */}
            {loginBlocked && (
              <div className="absolute top-0 inset-x-0 z-20 m-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 shadow-lg px-4 py-3 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Sign-in won't complete inside the app</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                    {displayName} blocks logging in through the in-app browser. Finish signing in a real browser tab{email ? " — your username will be copied automatically." : "."}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openNewTabWithUsername}>
                      <ExternalLink className="w-3.5 h-3.5" /> {email ? "Open in new tab & copy username" : `Open ${displayName} in new tab`}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40" onClick={() => setLoginBlocked(false)}>
                      Dismiss
                    </Button>
                  </div>
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
                onLoad={() => {
                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                  setLoadState("ready");
                }}
                onError={() => setLoadState("failed")}
              />
            )}
          </div>
        )}
        {addPartBar}
      </DialogContent>
    </Dialog>
  );
}
