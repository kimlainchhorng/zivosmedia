import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { FeedIncidentCommandCenter } from "@/components/admin/FeedIncidentCommandCenter";
import type { AdminVertical } from "./useAdminContext";

interface AdminTopbarProps {
  vertical: AdminVertical;
}

const VERTICAL_LABEL: Record<AdminVertical, string> = {
  restaurant: "Restaurant",
  business: "Business",
  grocery: "Grocery",
  retail: "Retail",
  cafe: "Cafe",
  service: "Service",
  mobility: "Mobility",
  generic: "Admin",
};

const QUICK_LINKS = [
  { label: "Orders", path: "/shop-dashboard/orders" },
  { label: "Products", path: "/shop-dashboard/products" },
  { label: "Employees", path: "/shop-dashboard/employees" },
  { label: "Analytics", path: "/shop-dashboard/analytics" },
  { label: "Payroll", path: "/shop-dashboard/payroll" },
  { label: "Settings", path: "/shop-dashboard/settings" },
  { label: "Wallet", path: "/shop-dashboard/wallet" },
  { label: "Schedule", path: "/shop-dashboard/employee-schedule" },
  { label: "Promotions", path: "/shop-dashboard/promotions" },
];

export function AdminTopbar({ vertical }: AdminTopbarProps) {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const results = query.trim()
    ? QUICK_LINKS.filter(l => l.label.toLowerCase().includes(query.toLowerCase()))
    : [];

  const handleSelect = (path: string) => {
    navigate(path);
    setSearchOpen(false);
    setQuery("");
  };

  return (
    <div className="flex-1 flex items-center justify-between gap-2 min-w-0 pr-2">
      {searchOpen ? (
        <div className="flex-1 flex items-center gap-2 relative">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search dashboard…"
              className="pl-8 h-8 text-sm"
              onKeyDown={e => {
                if (e.key === "Escape") { setSearchOpen(false); setQuery(""); }
                if (e.key === "Enter" && results[0]) handleSelect(results[0].path);
              }}
            />
            {results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                {results.map(r => (
                  <button type="button" key={r.path} onClick={() => handleSelect(r.path)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2">
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" aria-label="Close search" className="h-8 w-8 shrink-0"
            onClick={() => { setSearchOpen(false); setQuery(""); }}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="secondary" className="rounded-full text-[10px] px-2">
              {VERTICAL_LABEL[vertical]}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Search" className="h-8 w-8"
              onClick={() => setSearchOpen(true)}>
              <Search className="w-4 h-4" />
            </Button>
            <FeedIncidentCommandCenter compact />
          </div>
        </>
      )}
    </div>
  );
}
