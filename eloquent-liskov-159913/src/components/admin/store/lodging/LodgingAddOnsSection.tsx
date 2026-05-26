import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PackagePlus, Search } from "lucide-react";
import { AddonList, EmptyPanel, LoadingPanel, NextActions, SectionShell, StatCard, addonCategories, money, useLodgingOpsData } from "./LodgingOperationsShared";
import { cn } from "@/lib/utils";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

const statusFilters = ["All", "Active", "Hidden", "Free", "Paid"];
const goRooms = () => window.dispatchEvent(new CustomEvent("lodge-set-tab", { detail: { tab: "lodge-rooms" } }));

export default function LodgingAddOnsSection({ storeId }: { storeId: string }) {
  const { rooms, addons, isLoading } = useLodgingOpsData(storeId);
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");
  const active = addons.filter((a) => a.active !== false && !a.disabled);
  const filtered = useMemo(() => addons.filter((addon) => {
    const hidden = addon.active === false || addon.disabled;
    const matchesCategory = category === "All" || addon.category === category;
    const matchesStatus = status === "All" || (status === "Active" && !hidden) || (status === "Hidden" && hidden) || (status === "Free" && !hidden && !addon.price_cents) || (status === "Paid" && !hidden && addon.price_cents > 0);
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || addon.name.toLowerCase().includes(q) || addon.roomName.toLowerCase().includes(q);
    return matchesCategory && matchesStatus && matchesQuery;
  }), [addons, category, status, query]);

  return (
    <SectionShell title="Add-ons & Packages" subtitle="Search, filter, and audit guest-visible extras saved inside room records." icon={PackagePlus} actions={<Button size="sm" onClick={goRooms}>Manage room add-ons</Button>}>
      <LodgingQuickJump active="lodge-addons" />
      <LodgingSectionStatusBanner title="Add-ons & Packages" icon={PackagePlus} countLabel="Active add-ons" countValue={active.length} fixLabel="Open rate plans" fixTab="lodge-rate-plans" />
      {isLoading ? <LoadingPanel /> : <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active add-ons" value={String(active.length)} icon={PackagePlus} />
          <StatCard label="Rooms using add-ons" value={String(new Set(addons.map((a) => a.roomId)).size)} icon={PackagePlus} />
          <StatCard label="Paid add-ons" value={String(active.filter((a) => a.price_cents > 0).length)} icon={PackagePlus} />
          <StatCard label="Free add-ons" value={String(active.filter((a) => !a.price_cents).length)} icon={PackagePlus} />
        </div>
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search add-on or room" className="pl-9" /></div>
          <FilterRow values={["All", ...addonCategories]} current={category} onChange={setCategory} />
          <FilterRow values={statusFilters} current={status} onChange={setStatus} />
        </div>
        {addons.length === 0 ? <EmptyPanel title="Guest service catalog is ready to fill" body="Create breakfast, transfers, spa, tours, late check-out, celebration packages, and free perks from each room type." actionLabel="Add room add-ons" tab="lodge-rooms" /> : filtered.length === 0 ? <EmptyPanel title="No add-ons match these filters" body="Change the search, category, or status filter to review more room add-ons." actionLabel="Edit add-ons in Rooms" tab="lodge-rooms" /> : addonCategories.map((cat) => {
          const items = filtered.filter((a) => a.category === cat);
          if (!items.length) return null;
          return <div key={cat} className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-foreground">{cat}</p><Badge variant="outline">{items.length}</Badge></div><AddonList addons={items} emptyTitle="" emptyBody="" /><Button size="sm" variant="outline" className="h-8 text-xs" onClick={goRooms}>Edit in Rooms & Rates</Button></div>;
        })}
        <NextActions actions={[{ label: "Open guest requests", tab: "lodge-guest-requests", hint: "Review service requests and add-on outcomes." }, { label: "Edit room packages", tab: "lodge-rooms", hint: `Manage add-ons across ${rooms.length} room type${rooms.length === 1 ? "" : "s"}.` }, { label: "Check reports", tab: "lodge-reports", hint: `Track extras like ${money(active.reduce((sum, a) => sum + (a.price_cents || 0), 0))} catalog value.` }]} />
      </>}
    </SectionShell>
  );
}

function FilterRow({ values, current, onChange }: { values: string[]; current: string; onChange: (value: string) => void }) {
  return <div className="flex gap-1.5 overflow-x-auto pb-1">{values.map((value) => <button type="button" key={value} onClick={() => onChange(value)} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium", current === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>{value}</button>)}</div>;
}
