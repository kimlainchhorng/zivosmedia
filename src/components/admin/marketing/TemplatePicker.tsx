/**
 * TemplatePicker — shared template selector for Ads and Marketing wizards.
 * Filterable by channel; shows usage count + last used.
 */
import { useMemo, useState } from "react";
import { FileText, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useMarketingTemplates, type MarketingTemplate } from "@/hooks/useMarketingTemplates";
import { getStarterTemplates } from "@/lib/marketing/starterTemplates";

interface Props {
  storeId: string;
  channel?: string;
  onPick: (t: MarketingTemplate) => void;
  onCreateNew?: () => void;
  className?: string;
  /** Store category — selects which starter templates to suggest. */
  category?: string;
  /** Store name — woven into starter template copy. */
  storeName?: string;
}

export default function TemplatePicker({ storeId, channel, onPick, onCreateNew, className, category, storeName }: Props) {
  const { data: templates = [], isLoading } = useMarketingTemplates(storeId, channel);
  const [q, setQ] = useState("");

  const starters = useMemo(
    () => getStarterTemplates({ category, channel, store: storeName }),
    [category, channel, storeName],
  );
  const ql = q.toLowerCase();
  const filteredStarters = starters.filter((t) => t.name.toLowerCase().includes(ql));
  const filtered = templates.filter((t) => t.name.toLowerCase().includes(ql));

  const renderTemplate = (t: MarketingTemplate) => {
    const isStarter = t.id.startsWith("starter:");
    return (
      <button type="button"
        key={t.id}
        onClick={() => onPick(t)}
        className="w-full flex items-start gap-2 p-2.5 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/30 text-left transition"
      >
        <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold truncate">{t.name}</div>
          <div className="text-[10px] text-muted-foreground truncate">
            {t.channel.toUpperCase()} · {isStarter ? "Starter" : `used ${t.usage_count}×`}
            {!isStarter && t.last_used_at && " · recently"}
          </div>
          {t.body && (
            <div className="text-[10px] text-muted-foreground/70 line-clamp-1 mt-0.5">{t.body}</div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search templates…"
          className="h-8 text-xs flex-1"
        />
        {onCreateNew && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[11px]"
            onClick={onCreateNew}
          >
            <Plus className="w-3 h-3 mr-1" /> New
          </Button>
        )}
      </div>
      {filteredStarters.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="w-3 h-3 text-primary" /> Starter templates
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {filteredStarters.map(renderTemplate)}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {filteredStarters.length > 0 && (
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pt-1">Your templates</div>
        )}
        {isLoading ? (
          <div className="py-4 text-center text-xs text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
            No saved templates {channel ? `for ${channel}` : "yet"}.
            {onCreateNew && (
              <Button type="button" variant="link" size="sm" className="text-[11px] h-auto px-1" onClick={onCreateNew}>
                Create one
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {filtered.map(renderTemplate)}
          </div>
        )}
      </div>
    </div>
  );
}
