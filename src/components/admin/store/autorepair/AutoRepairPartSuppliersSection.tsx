/**
 * Auto Repair — Parts Suppliers
 * Saves portal credentials to localStorage (per store + supplier).
 * "Save & Open Portal" stores creds then opens the supplier URL in a new tab.
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import Check from "lucide-react/dist/esm/icons/check";
import X from "lucide-react/dist/esm/icons/x";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import Key from "lucide-react/dist/esm/icons/key";
import Search from "lucide-react/dist/esm/icons/search";
import Store from "lucide-react/dist/esm/icons/store";
import Eye from "lucide-react/dist/esm/icons/eye";
import EyeOff from "lucide-react/dist/esm/icons/eye-off";
import { toast } from "sonner";

interface Props { storeId: string }

type Cat = "All" | "Retail Chain" | "OE / Dealer" | "Wholesale Distributor" | "Online Marketplace" | "Specialty";

type Supplier = {
  id: string;
  name: string;
  desc: string;
  cat: Exclude<Cat, "All">;
  url: string;
  bg: string;
  initials: string;
};

type Cred = { username: string; password: string; account?: string; email?: string };

type VendorSetup = {
  useAccountEmail: boolean;
  accountLabel?: string;
  steps?: string[];
  phone?: string;
  /** Direct catalog URL that skips the vehicle-selector dead-end. */
  shopUrl?: string;
};

const VENDOR_SETUP: Record<string, VendorSetup> = {
  autozonepro:  { useAccountEmail: true,  accountLabel: "Account #", steps: ["Enter Your Account Number and your Email", "Call AutoZone @1-866-853-6459 and Ask to use VIP for Electronic Ordering.", "When the AutoZone portal opens — click 'Shop Without Vehicle' to browse all parts, or enter your vehicle (Year/Make/Model) manually on their page."], phone: "1-866-853-6459", shopUrl: "https://www.autozonepro.com/catalog/home" },
  firstcall:    { useAccountEmail: true,  accountLabel: "Account #", steps: ["Enter your O'Reilly commercial account number", "Call O'Reilly @1-800-755-6759 to enable electronic ordering."], phone: "1-800-755-6759", shopUrl: "https://www.firstcallonline.com" },
  napapro:      { useAccountEmail: true,  accountLabel: "Account #", steps: ["Enter your NAPA ProLink account number", "Call your local NAPA store to enable electronic ordering."], shopUrl: "https://www.napaonline.com/en/prolink" },
  oreillypro:   { useAccountEmail: true,  accountLabel: "Account #", steps: ["Enter your O'Reilly PRO account number and email", "Call 1-800-755-6759 to enable PRO electronic ordering."], phone: "1-800-755-6759", shopUrl: "https://www.oreillyauto.com/pro" },
  carquestpro:  { useAccountEmail: true,  accountLabel: "Account #", steps: ["Enter your Carquest account number and email", "Contact your local Carquest store to enable ordering."], shopUrl: "https://www.carquest.com" },
  acdelco:      { useAccountEmail: true,  accountLabel: "Dealer Code", steps: ["Enter your ACDelco dealer code and email", "Call 1-800-825-5886 to activate electronic ordering."], phone: "1-800-825-5886", shopUrl: "https://www.acdelco.com" },
};

const CATS: Cat[] = ["All", "Retail Chain", "OE / Dealer", "Wholesale Distributor", "Online Marketplace", "Specialty"];

const SUPPLIERS: Supplier[] = [
  // Retail Chain
  { id: "autozonepro",    name: "AutoZonePro",        desc: "Commercial parts portal",     cat: "Retail Chain",          url: "https://www.autozonepro.com",                       bg: "#e63946", initials: "AZ"  },
  { id: "firstcall",      name: "FirstCall",           desc: "O'Reilly pro shop portal",    cat: "Retail Chain",          url: "https://www.firstcallonline.com",                   bg: "#2a9d8f", initials: "FC"  },
  { id: "pepboys",        name: "Pep Boys Fleet",      desc: "Fleet & trade accounts",      cat: "Retail Chain",          url: "https://www.pepboys.com/commercial",                bg: "#e76f51", initials: "PB"  },
  { id: "autopartsway",   name: "AutoPartsWAY",        desc: "Retail Chain",                cat: "Retail Chain",          url: "https://www.autopartsway.com",                      bg: "#457b9d", initials: "APW" },
  { id: "napapro",        name: "NAPA ProLink",        desc: "NAPA professional portal",    cat: "Retail Chain",          url: "https://www.napaonline.com/en/prolink",             bg: "#1d3557", initials: "NP"  },
  { id: "oreillypro",     name: "O'Reilly Pro",        desc: "Commercial account portal",   cat: "Retail Chain",          url: "https://www.oreillyauto.com/pro",                   bg: "#c1121f", initials: "OR"  },
  // OE / Dealer
  { id: "prolink",        name: "PROLink",             desc: "Trade portal - login required", cat: "OE / Dealer",         url: "https://www.proplinkparts.com",                     bg: "#6c757d", initials: "PRL" },
  { id: "carquestpro",    name: "Carquest Pro",        desc: "Shop / trade orders",         cat: "OE / Dealer",           url: "https://www.carquest.com",                          bg: "#343a40", initials: "CQ"  },
  { id: "fmp",            name: "FMP",                 desc: "OE & aftermarket trade",      cat: "OE / Dealer",           url: "https://www.fmp.com",                               bg: "#495057", initials: "FMP" },
  { id: "mopar",          name: "Mopar",               desc: "Stellantis pro portal",       cat: "OE / Dealer",           url: "https://www.mopar.com",                             bg: "#003049", initials: "MP"  },
  { id: "acdelco",        name: "ACDelco",             desc: "GM technician portal",        cat: "OE / Dealer",           url: "https://www.acdelco.com",                           bg: "#0096c7", initials: "AD"  },
  { id: "motorcraft",     name: "Motorcraft",          desc: "Ford pro service portal",     cat: "OE / Dealer",           url: "https://www.motorcraft.com",                        bg: "#023e8a", initials: "MC"  },
  { id: "toyotatIS",      name: "Toyota TIS",          desc: "Tech info & parts",           cat: "OE / Dealer",           url: "https://techinfo.toyota.com",                       bg: "#c1121f", initials: "TT"  },
  { id: "serviceexpress", name: "ServiceExpress",      desc: "Honda pro portal",            cat: "OE / Dealer",           url: "https://hondaservice.com",                          bg: "#e63946", initials: "SE"  },
  { id: "subarustis",     name: "Subaru STIS",         desc: "Tech & parts portal",         cat: "OE / Dealer",           url: "https://www.subarunet.com",                         bg: "#014f86", initials: "SS"  },
  { id: "bmwtis",         name: "BMW TIS",             desc: "BMW tech portal",             cat: "OE / Dealer",           url: "https://tis.bmw.de",                               bg: "#0077b6", initials: "BT"  },
  { id: "vwerwin",        name: "VW erWin",            desc: "VW workshop info",            cat: "OE / Dealer",           url: "https://erwin.vw.com",                             bg: "#0096c7", initials: "VW"  },
  // Wholesale Distributor
  { id: "partsauthority", name: "Parts Authority",     desc: "Pro distribution",            cat: "Wholesale Distributor", url: "https://www.partsauthority.com",                    bg: "#d62828", initials: "PA"  },
  { id: "uap",            name: "UAP",                 desc: "Wholesale Distributor",       cat: "Wholesale Distributor", url: "https://www.uapinc.com",                            bg: "#f4a261", initials: "UAP" },
  { id: "lkq",            name: "LKQ",                 desc: "LKQ Online B2B",              cat: "Wholesale Distributor", url: "https://www.lkqcorp.com",                           bg: "#2d6a4f", initials: "LKQ" },
  { id: "advancepro",     name: "Advance Pro",         desc: "AdvancePro B2B",              cat: "Wholesale Distributor", url: "https://www.advanceautoparts.com/b2b",              bg: "#d62828", initials: "AP"  },
  { id: "speeddial",      name: "speedDIAL",           desc: "Pro ordering - login required", cat: "Wholesale Distributor", url: "https://www.speeddial.com",                      bg: "#2b9348", initials: "SD"  },
  // Online Marketplace
  { id: "rockauto",       name: "RockAuto",            desc: "Online Marketplace",          cat: "Online Marketplace",    url: "https://www.rockauto.com",                          bg: "#e76f51", initials: "RA"  },
  { id: "partsgeek",      name: "PartsGeek",           desc: "Online Marketplace",          cat: "Online Marketplace",    url: "https://www.partsgeek.com",                         bg: "#4361ee", initials: "PG"  },
  { id: "fcpeuro",        name: "FCP Euro",            desc: "Euro specialty parts",        cat: "Online Marketplace",    url: "https://www.fcpeuro.com",                           bg: "#023e8a", initials: "FCP" },
  { id: "carid",          name: "CARiD",               desc: "Performance & OEM parts",     cat: "Online Marketplace",    url: "https://www.carid.com",                             bg: "#e63946", initials: "CID" },
  // Specialty
  { id: "keystone",       name: "Keystone Automotive", desc: "eKeystone B2B",              cat: "Specialty",             url: "https://www.keystoneautomotive.com",                bg: "#6d6875", initials: "KA"  },
  { id: "dorman",         name: "Dorman Products",     desc: "OE-fix replacement parts",    cat: "Specialty",             url: "https://www.dormanproducts.com",                    bg: "#e9c46a", initials: "DP"  },
  { id: "standardmotor",  name: "Standard Motor",      desc: "SMP Pro B2B portal",          cat: "Specialty",             url: "https://www.standardmotor.com",                     bg: "#264653", initials: "SM"  },
  { id: "boschparts",     name: "Bosch Parts Direct",  desc: "Bosch technician portal",     cat: "Specialty",             url: "https://www.boschautoparts.com",                    bg: "#ef233c", initials: "BD"  },
  { id: "ngkdirect",      name: "NGK Direct",          desc: "Ignition & sensor specialist", cat: "Specialty",            url: "https://www.ngksparkplugs.com",                     bg: "#c1121f", initials: "NGK" },
  { id: "delphi",         name: "Delphi Technologies", desc: "OE systems & sensors",        cat: "Specialty",             url: "https://www.delphiautomotive.com",                  bg: "#4cc9f0", initials: "DT"  },
];

function credKey(storeId: string, supplierId: string) {
  return `ar_supplier_${storeId}_${supplierId}`;
}

function loadCred(storeId: string, supplierId: string): Cred | null {
  try {
    const raw = localStorage.getItem(credKey(storeId, supplierId));
    return raw ? (JSON.parse(raw) as Cred) : null;
  } catch {
    return null;
  }
}

function persistCred(storeId: string, supplierId: string, cred: Cred) {
  localStorage.setItem(credKey(storeId, supplierId), JSON.stringify(cred));
}

function removeCred(storeId: string, supplierId: string) {
  localStorage.removeItem(credKey(storeId, supplierId));
}

/**
 * Vendors the shop has connected (saved an account/credentials for), for use in
 * other AR screens like Build R.O.'s vendor picker. Reads the same localStorage
 * keys this screen writes. Returns the supplier name + portal URL.
 */
export type ConnectedVendor = { id: string; name: string; url: string; account?: string };
export function listConnectedVendors(storeId: string): ConnectedVendor[] {
  return SUPPLIERS
    .map((s) => {
      const cred = loadCred(storeId, s.id);
      return cred ? { id: s.id, name: s.name, url: s.url, account: cred.account } : null;
    })
    .filter((v): v is ConnectedVendor => v !== null);
}

/** All known supplier names, for free-pick fallback in vendor dropdowns. */
export const AR_SUPPLIER_NAMES: string[] = SUPPLIERS.map((s) => s.name);

export default function AutoRepairPartSuppliersSection({ storeId }: Props) {
  const [catFilter, setCatFilter] = useState<Cat>("All");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<Supplier | null>(null);
  const [form, setForm] = useState<Cred>({ username: "", password: "", account: "", email: "" });
  const [showPw, setShowPw] = useState(false);

  const [savedMap, setSavedMap] = useState<Record<string, Cred | null>>(() => {
    const map: Record<string, Cred | null> = {};
    SUPPLIERS.forEach(s => { map[s.id] = loadCred(storeId, s.id); });
    return map;
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return SUPPLIERS.filter(s =>
      (catFilter === "All" || s.cat === catFilter) &&
      (!q || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q))
    );
  }, [catFilter, search]);

  const connectedCount = Object.values(savedMap).filter(Boolean).length;

  const openDialog = (s: Supplier) => {
    const existing = savedMap[s.id];
    setForm(existing ?? { username: "", password: "", account: "", email: "" });
    setShowPw(false);
    setTarget(s);
  };

  // B2B vendor portals block iframe embedding (X-Frame-Options), so open them
  // in a real new tab instead of the in-app modal.
  const openPortal = (s: Supplier) => {
    const w = window.open(s.url, "_blank", "noopener,noreferrer");
    if (!w) { toast.error("Pop-up blocked — allow pop-ups to open the portal"); return; }
  };

  const handleSave = () => {
    if (!target) return;
    const setup = VENDOR_SETUP[target.id];
    if (setup?.useAccountEmail) {
      if (!form.account?.trim()) { toast.error("Account number is required"); return; }
    } else {
      if (!form.username.trim()) { toast.error("Username / email is required"); return; }
    }
    const cred: Cred = { username: form.username.trim(), password: form.password, account: form.account?.trim() || "", email: form.email?.trim() || "" };
    persistCred(storeId, target.id, cred);
    setSavedMap(prev => ({ ...prev, [target.id]: cred }));
    toast.success(`${target.name} — account saved`);
    const saved = target;
    setTarget(null);
    openPortal(saved);
  };

  const handleDisconnect = (s: Supplier) => {
    removeCred(storeId, s.id);
    setSavedMap(prev => ({ ...prev, [s.id]: null }));
    toast.success(`${s.name} disconnected`);
    setTarget(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="w-4 h-4" />
            Parts Suppliers
            <Badge variant="secondary" className="ml-1">{SUPPLIERS.length}</Badge>
            {connectedCount > 0 && (
              <Badge className="ml-1 bg-green-600 text-white text-[10px]">
                {connectedCount} connected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers (AutoZone, NAPA, RockAuto...)"
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap">
            {CATS.map(c => (
              <Button
                key={c}
                size="sm"
                variant={catFilter === c ? "default" : "outline"}
                onClick={() => setCatFilter(c)}
                className="h-7 px-3 text-xs shrink-0"
              >
                {c}
              </Button>
            ))}
          </div>

          {/* Supplier grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 pt-1">
            {filtered.map(s => {
              const cred = savedMap[s.id];
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                    cred
                      ? "border-green-500/40 bg-green-50/30 dark:bg-green-950/20"
                      : "border-border bg-card"
                  }`}
                >
                  {/* Logo badge */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-[9px] tracking-tight shrink-0"
                    style={{ backgroundColor: s.bg }}
                  >
                    {s.initials}
                  </div>

                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate leading-tight">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {cred ? "Account saved" : s.desc}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {cred ? (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-green-600"
                          title="Open portal in new tab"
                          onClick={() => openPortal(s)}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Edit credentials"
                          onClick={() => openDialog(s)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Connect account"
                        onClick={() => openDialog(s)}
                      >
                        <Key className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* VSM-styled Setup Vendor Account dialog */}
      <Dialog open={!!target} onOpenChange={open => { if (!open) setTarget(null); }}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden border-slate-700 bg-[#0b1220] p-0 text-slate-100">
          <DialogHeader className="p-0">
            {/* Title bar */}
            <div className="flex items-center gap-3 bg-slate-800/80 px-5 py-3">
              <span className="font-serif text-lg italic tracking-wide text-slate-300">VIP</span>
              <DialogTitle className="text-base font-bold text-slate-100">Setup Vendor Account:</DialogTitle>
            </div>
            {/* Blue gradient sub-header */}
            <div className="bg-gradient-to-b from-[#1e90ff] to-[#1577e0] py-2 text-center">
              <span className="font-serif text-base italic text-white">{target?.name}</span>
            </div>
          </DialogHeader>

          <div className="space-y-4 bg-white px-6 py-5 text-slate-800">
            {/* Vendor logo placeholder */}
            <div className="flex justify-center">
              <div className="rounded-lg px-6 py-3 text-white font-bold text-xl tracking-wide"
                style={{ backgroundColor: target?.bg }}>
                {target?.name}
              </div>
            </div>

            {(() => {
              const setup = target ? VENDOR_SETUP[target.id] : null;
              if (setup?.useAccountEmail) {
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="w-24 text-right text-sm font-semibold shrink-0">{setup.accountLabel ?? "Account #"}:</label>
                      <input className="flex-1 rounded border border-blue-400 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={form.account ?? ""}
                        onChange={e => setForm(f => ({ ...f, account: e.target.value }))}
                        placeholder="" />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="w-24 text-right text-sm font-semibold shrink-0">Email:</label>
                      <input type="email" className="flex-1 rounded border border-blue-400 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={form.email ?? ""}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="" />
                    </div>
                    {setup.steps && (
                      <div className="rounded-lg bg-slate-900 p-3 text-white">
                        <p className="text-xs font-semibold text-red-400 mb-2">To Complete {target?.name} Setup:</p>
                        {setup.steps.map((step, i) => (
                          <p key={i} className="text-xs text-slate-300">Step {i + 1} : {step}</p>
                        ))}
                      </div>
                    )}
                    {/* Vehicle-transfer explainer */}
                    <div className="rounded-lg border border-amber-400 bg-amber-50 p-3">
                      <p className="text-xs font-semibold text-amber-700">Seeing "no vehicle set" on {target?.name}?</p>
                      <p className="text-[11px] text-amber-700/90 leading-snug mt-1">
                        Automatic vehicle transfer only works after {target?.name} enables <strong>electronic ordering</strong> on your
                        account (Step&nbsp;2 above). Until then — or any time transfer fails — use the button below to skip the
                        vehicle screen, or type the Year / Make / Model on their page.
                      </p>
                    </div>
                    {/* One-click Shop Without Vehicle */}
                    <button type="button"
                      onClick={() => {
                        const url = setup.shopUrl || target?.url;
                        if (!url) return;
                        const w = window.open(url, "_blank", "noopener,noreferrer");
                        if (!w) toast.error("Pop-up blocked — allow pop-ups to open the portal");
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                      <Store className="h-4 w-4" /> Shop Without Vehicle →
                    </button>
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="w-24 text-right text-sm font-semibold shrink-0">Username:</label>
                    <input className="flex-1 rounded border border-blue-400 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      autoComplete="username" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="w-24 text-right text-sm font-semibold shrink-0">Password:</label>
                    <div className="relative flex-1">
                      <input type={showPw ? "text" : "password"} className="w-full rounded border border-blue-400 px-3 py-1.5 pr-16 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        autoComplete="current-password"
                        onKeyDown={e => { if (e.key === "Enter") handleSave(); }} />
                      <button type="button" className="absolute right-2 top-1.5 text-xs text-blue-600"
                        onClick={() => setShowPw(v => !v)}>
                        {showPw ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-3 border-t border-slate-700 bg-slate-900/60 px-6 py-3">
            {savedMap[target?.id ?? ""] && (
              <button onClick={() => target && handleDisconnect(target)}
                className="rounded border border-red-500/60 bg-slate-800 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-slate-700">
                Disconnect
              </button>
            )}
            <button onClick={handleSave}
              className="rounded bg-[#1e90ff] px-10 py-2.5 font-semibold text-white hover:bg-[#1577e0]">
              Save
            </button>
            <button onClick={() => setTarget(null)}
              className="flex items-center gap-1 rounded border border-red-500/60 bg-slate-800 px-6 py-2.5 font-semibold text-red-400 hover:bg-slate-700">
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
