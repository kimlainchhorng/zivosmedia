import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Search from "lucide-react/dist/esm/icons/search";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import Clock from "lucide-react/dist/esm/icons/clock";
import { LABOR_GUIDE, LABOR_GUIDE_CATEGORIES, DIFF_COLOR, type LaborGuideEntry } from "@/lib/laborGuide";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (entry: LaborGuideEntry) => void;
  title?: string;
}

export default function LaborGuidePickerDialog({ open, onOpenChange, onSelect, title = "Labor Guide" }: Props) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return LABOR_GUIDE.filter(e =>
      (cat === "All" || e.category === cat) &&
      (!q || e.service.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
    );
  }, [search, cat]);

  const grouped = useMemo(() => {
    const g: Record<string, LaborGuideEntry[]> = {};
    filtered.forEach(e => {
      if (!g[e.category]) g[e.category] = [];
      g[e.category].push(e);
    });
    return g;
  }, [filtered]);

  const handleSelect = (entry: LaborGuideEntry) => {
    onSelect(entry);
    onOpenChange(false);
    setSearch("");
    setCat("All");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-4 h-4" /> {title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 space-y-2 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9"
              placeholder="Search services…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            {LABOR_GUIDE_CATEGORIES.map(c => (
              <button type="button"
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors border",
                  cat === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:border-border"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No services match your search.</p>
          ) : (
            Object.entries(grouped).map(([category, entries]) => (
              <div key={category}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
                  {category}
                </p>
                <div className="space-y-1">
                  {entries.map(entry => (
                    <div
                      key={entry.service}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 hover:bg-muted/50 hover:border-border transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{entry.service}</p>
                        {entry.notes && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{entry.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1 text-xs tabular-nums font-semibold text-foreground">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {entry.baseHours}h
                        </span>
                        <Badge
                          className={cn("text-[10px] px-1.5 py-0 capitalize border-0", DIFF_COLOR[entry.diff])}
                        >
                          {entry.diff}
                        </Badge>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleSelect(entry)}
                        >
                          Use
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
