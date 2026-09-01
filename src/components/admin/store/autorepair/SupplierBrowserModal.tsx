/**
 * SupplierBrowserModal
 *
 * Supplier portals run only in their own HTTPS tab. Third-party HTML is never
 * fetched through ZIVO or executed inside the Admin application.
 */
import { useEffect, useMemo, useState } from "react";
import { copyText } from "@/lib/native/clipboard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Check from "lucide-react/dist/esm/icons/check";
import Copy from "lucide-react/dist/esm/icons/copy";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import Eye from "lucide-react/dist/esm/icons/eye";
import EyeOff from "lucide-react/dist/esm/icons/eye-off";
import Globe from "lucide-react/dist/esm/icons/globe";
import Info from "lucide-react/dist/esm/icons/info";
import KeyRound from "lucide-react/dist/esm/icons/key-round";
import PlusCircle from "lucide-react/dist/esm/icons/plus-circle";
import Search from "lucide-react/dist/esm/icons/search";
import ShieldAlert from "lucide-react/dist/esm/icons/shield-alert";
import PartsSupplierLogo from "./PartsSupplierLogo";
import {
  type PartsSupplier,
  getSupplierSearchUrl,
} from "@/config/partsSuppliers";
import { isAutoRepairSoftwareHost } from "@/config/autoRepairDomain";

/** A part the user captured from a supplier portal, to add to the open R.O. */
export type CapturedPart = {
  description: string;
  sku: string;
  brand: string;
  price: number;
  qty: number;
};

interface Props {
  storeId: string;
  supplier: PartsSupplier | null;
  query?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPart?: (part: CapturedPart) => void;
}

type SavedCreds = { email: string; updatedAt: string };
type LaunchStep = "idle" | "tab_opened";

const credKey = (storeId: string, supplierId: string) =>
  `zivo.supplierCreds.${storeId}.${supplierId}`;

function loadCreds(storeId: string, supplierId: string): SavedCreds | null {
  const key = credKey(storeId, supplierId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.email !== "string" || !parsed.email.trim()) {
      localStorage.removeItem(key);
      return null;
    }

    const safe: SavedCreds = {
      email: parsed.email.trim(),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
    // Migrate old entries by replacing them with account metadata only. Passwords
    // are entered for the current session and never synced to the application database.
    localStorage.setItem(key, JSON.stringify(safe));
    return safe;
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage may be unavailable in a hardened browser.
    }
    return null;
  }
}

function saveCreds(
  storeId: string,
  supplierId: string,
  email: string,
): boolean {
  try {
    localStorage.setItem(
      credKey(storeId, supplierId),
      JSON.stringify({
        email,
        updatedAt: new Date().toISOString(),
      } satisfies SavedCreds),
    );
    return true;
  } catch {
    return false;
  }
}

function clearCreds(storeId: string, supplierId: string): boolean {
  try {
    localStorage.removeItem(credKey(storeId, supplierId));
    return true;
  } catch {
    return false;
  }
}

function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export default function SupplierBrowserModal({
  storeId,
  supplier,
  query,
  open,
  onOpenChange,
  onAddPart,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);
  const [saved, setSaved] = useState<SavedCreds | null>(null);
  const [editing, setEditing] = useState(true);
  const [launchStep, setLaunchStep] = useState<LaunchStep>("idle");
  const [searchQuery, setSearchQuery] = useState(query ?? "");
  const [partDescription, setPartDescription] = useState("");
  const [partSku, setPartSku] = useState("");
  const [partPrice, setPartPrice] = useState("");
  const [partQuantity, setPartQuantity] = useState("1");

  const portalUrl = useMemo(() => {
    if (!supplier) return null;
    return safeHttpsUrl(
      supplier.portalUrl ||
        (supplier.domain ? `https://${supplier.domain}` : null),
    );
  }, [supplier]);

  const consumerUrl = useMemo(
    () =>
      safeHttpsUrl(
        supplier?.consumerDomain ? `https://${supplier.consumerDomain}` : null,
      ),
    [supplier?.consumerDomain],
  );

  useEffect(() => {
    if (!open || !supplier) return;
    const existing = loadCreds(storeId, supplier.id);
    setSaved(existing);
    setEmail(existing?.email ?? "");
    setPassword("");
    setShowPassword(false);
    setEditing(!existing);
    setCopied(null);
    setLaunchStep("idle");
    setSearchQuery(query ?? "");
  }, [open, query, storeId, supplier]);

  if (!supplier) return null;

  const displayName = supplier.shortName ?? supplier.name;
  const isAutoRepairSoftwareDomain =
    typeof window !== "undefined" &&
    isAutoRepairSoftwareHost(window.location.hostname);
  const workspaceName = isAutoRepairSoftwareDomain ? "business" : "shop";

  const openExternal = (value: string | null): boolean => {
    if (!value) {
      toast.error(`${displayName} does not have a valid secure portal URL.`);
      return false;
    }
    try {
      const opened = window.open(value, "_blank", "noopener,noreferrer");
      if (opened) {
        opened.opener = null;
        return true;
      }
    } catch {
      // Keep the Admin workspace in place when the browser blocks the new tab.
    }
    toast.error(
      `Allow pop-ups for ZIVO, then try opening ${displayName} again.`,
    );
    return false;
  };

  const copyCredential = async (value: string, kind: "email" | "password") => {
    if (!value) return false;
    try {
      await copyText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2_000);
      return true;
    } catch {
      toast.error("Could not copy");
      return false;
    }
  };

  const handleSave = () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      toast.error("Email is required");
      return;
    }
    if (!saveCreds(storeId, supplier.id, normalizedEmail)) {
      toast.error("This browser could not save the account name.");
      return;
    }
    const nextSaved = {
      email: normalizedEmail,
      updatedAt: new Date().toISOString(),
    };
    setSaved(nextSaved);
    setEmail(normalizedEmail);
    setEditing(false);
    toast.success(`Account saved for the ${workspaceName}`);
  };

  const handleClear = () => {
    if (!clearCreds(storeId, supplier.id)) {
      toast.error("This browser could not remove the saved account.");
      return;
    }
    setSaved(null);
    setEmail("");
    setPassword("");
    setEditing(true);
    toast.success(`Account removed for the ${workspaceName}`);
  };

  const launchAndCopyUsername = async () => {
    if (!openExternal(portalUrl)) return;
    if (email) {
      const didCopy = await copyCredential(email, "email");
      toast.success(
        didCopy
          ? "Sign-in page opened — username copied. Paste it in the login field."
          : "Sign-in page opened. Use the copy button for your username.",
      );
    } else {
      toast.success("Sign-in page opened.");
    }
    setLaunchStep("tab_opened");
  };

  const launchSearch = () => {
    const value = searchQuery.trim();
    if (!value) return;
    openExternal(safeHttpsUrl(getSupplierSearchUrl(supplier, value)));
  };

  const handleAddPart = (event: React.FormEvent) => {
    event.preventDefault();
    if (!onAddPart) return;
    const description = partDescription.trim();
    if (!description) {
      toast.error("Enter the part description first");
      return;
    }
    onAddPart({
      description,
      sku: partSku.trim(),
      brand: displayName,
      price: Number(partPrice) || 0,
      qty: Math.max(1, Number(partQuantity) || 1),
    });
    setPartDescription("");
    setPartSku("");
    setPartPrice("");
    setPartQuantity("1");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b bg-card px-4 py-3">
          <DialogTitle className="flex items-center gap-2.5">
            <PartsSupplierLogo supplier={supplier} size="md" />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-bold">{supplier.name}</p>
              <p className="text-[10px] font-normal text-muted-foreground">
                {supplier.domain} · {supplier.category}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => openExternal(portalUrl)}
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open site
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="space-y-2 text-center">
            <PartsSupplierLogo
              supplier={supplier}
              size="lg"
              className="mx-auto"
            />
            <h2 className="text-base font-bold">{supplier.name}</h2>
            <p className="text-xs text-muted-foreground">
              Opens securely on {supplier.domain}. Supplier pages are not
              embedded in ZIVO.
            </p>
          </div>

          <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">
                Your {displayName} account
              </p>
            </div>
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p>
                ZIVO saves only the account name in this browser. Your password
                stays in memory for this session and is never sent to the
                application database.
              </p>
            </div>

            {supplier.loginFlow === "two-step" && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-950/30">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <p className="text-[11px] text-amber-800 dark:text-amber-200">
                  <strong>Two-step login:</strong> paste the username, continue,
                  then return here to copy the password.
                </p>
              </div>
            )}

            <div className="space-y-2.5">
              <div className="space-y-1">
                <Label className="text-[11px]">Email / username</Label>
                <div className="flex gap-1.5">
                  <Input
                    className="h-9 flex-1 text-sm"
                    autoComplete="off"
                    readOnly={!editing}
                    placeholder={`your@${supplier.domain ?? "email.com"}`}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 shrink-0 p-0"
                    onClick={async () => {
                      if (await copyCredential(email, "email"))
                        toast.success("Username copied");
                    }}
                    disabled={!email}
                    title="Copy username"
                  >
                    {copied === "email" ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Password for this session</Label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Input
                      className="h-9 pr-9 text-sm"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    size="sm"
                    variant={
                      launchStep === "tab_opened" ? "default" : "outline"
                    }
                    className="h-9 w-9 shrink-0 p-0"
                    onClick={async () => {
                      if (await copyCredential(password, "password"))
                        toast.success("Password copied");
                    }}
                    disabled={!password}
                    title="Copy password"
                  >
                    {copied === "password" ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {saved && !editing ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive"
                    onClick={handleClear}
                  >
                    Remove
                  </Button>
                </>
              ) : (
                <>
                  {saved && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => {
                        setEmail(saved.email);
                        setEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={handleSave}
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Save account name
                  </Button>
                </>
              )}
            </div>
          </section>

          <div className="space-y-2">
            <Button
              size="lg"
              className="h-12 w-full gap-2 text-sm"
              onClick={launchAndCopyUsername}
            >
              <ExternalLink className="h-4 w-4" />
              {email
                ? `Open ${displayName} and copy username`
                : `Open ${displayName}`}
            </Button>
            {launchStep === "tab_opened" && (
              <p className="text-center text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                Supplier site opened in its own secure tab.
              </p>
            )}
            {consumerUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full gap-2 text-xs text-muted-foreground"
                onClick={() => openExternal(consumerUrl)}
              >
                <Globe className="h-3.5 w-3.5" /> Open consumer site
              </Button>
            )}
          </div>

          {supplier.searchUrlTemplate && (
            <section className="space-y-2 rounded-xl border bg-muted/30 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Search a part directly
              </p>
              <div className="flex gap-2">
                <Input
                  className="h-8 flex-1 text-xs"
                  placeholder={`Search on ${displayName}…`}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") launchSearch();
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 gap-1.5 text-xs"
                  onClick={launchSearch}
                  disabled={!searchQuery.trim()}
                >
                  <Search className="h-3.5 w-3.5" /> Search
                </Button>
              </div>
            </section>
          )}

          {onAddPart && (
            <form
              onSubmit={handleAddPart}
              className="space-y-3 rounded-xl border bg-card p-3"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <PlusCircle className="h-4 w-4" /> Add the selected part to the
                R.O.
              </p>
              <Input
                className="h-8 text-xs"
                placeholder={`Part found on ${displayName}…`}
                value={partDescription}
                onChange={(event) => setPartDescription(event.target.value)}
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  className="h-8 text-xs"
                  placeholder="Part #"
                  value={partSku}
                  onChange={(event) => setPartSku(event.target.value)}
                />
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Price"
                  value={partPrice}
                  onChange={(event) => setPartPrice(event.target.value)}
                />
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="Qty"
                  value={partQuantity}
                  onChange={(event) => setPartQuantity(event.target.value)}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="h-8 w-full gap-1.5 text-xs"
                disabled={!partDescription.trim()}
              >
                <PlusCircle className="h-3.5 w-3.5" /> Add line
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
