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

type Cred = { username: string; password: string };

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

export default function AutoRepairPartSuppliersSection({ storeId }: Props) {
  const [catFilter, setCatFilter] = useState<Cat>("All");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<Supplier | null>(null);
  const [form, setForm] = useState<Cred>({ username: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

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
    setForm(existing ?? { username: "", password: "" });
    setShowPw(false);
    setTarget(s);
  };

  const handleSave = () => {
    if (!target) return;
    if (!form.username.trim()) {
      toast.error("Username / email is required");
      return;
    }
    persistCred(storeId, target.id, { username: form.username.trim(), password: form.password });
    setSavedMap(prev => ({ ...prev, [target.id]: { username: form.username.trim(), password: form.password } }));
    toast.success(`${target.name} — account saved`);
    setPortalUrl(target.url);
    setTarget(null);
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
                          title="Open portal"
                          onClick={() => {
                            setPortalUrl(s.url);
                            setTarget(null);
                          }}
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

      {/* Credentials dialog */}
      <Dialog open={!!target} onOpenChange={open => { if (!open) setTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {target && (
                <span
                  className="w-7 h-7 rounded text-white flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{ backgroundColor: target.bg }}
                >
                  {target.initials}
                </span>
              )}
              Connect {target?.name}
            </DialogTitle>
            <DialogDescription>
              Enter your portal credentials. Saved locally on this device only.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Username / Email</label>
              <Input
                placeholder="Username or email"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Password</label>
              <div className="relative">
                <Input
                  placeholder="Password"
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  className="pr-20"
                  onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 px-2 text-xs"
                  onClick={() => setShowPw(v => !v)}
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Clicking <strong>Save & Open Portal</strong> will store your credentials and open{" "}
              {target?.name} in a modal so you can log in.
            </p>
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            {savedMap[target?.id ?? ""] && (
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 mr-auto"
                onClick={() => target && handleDisconnect(target)}
              >
                Disconnect
              </Button>
            )}
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Save & Open Portal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Portal iframe modal */}
      <Dialog open={!!portalUrl} onOpenChange={open => { if (!open) setPortalUrl(null); }}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Supplier Portal</DialogTitle>
          </DialogHeader>
          {portalUrl && (
            <iframe
              src={portalUrl}
              className="w-full h-full border-0 rounded"
              title="Supplier portal"
              sandbox="allow-same-origin allow-forms allow-scripts allow-popups allow-top-navigation"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
