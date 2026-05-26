/**
 * SegmentsManager — List + create/edit + refresh + delete.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Users, RefreshCw, Trash2, Edit } from "lucide-react";
import { useMarketingSegments, useDeleteSegment, useRefreshSegmentCount, type SegmentDef } from "@/hooks/useMarketingSegments";
import SegmentBuilder from "./SegmentBuilder";
import { formatDistanceToNow, parseISO } from "date-fns";

export default function SegmentsManager({ storeId }: { storeId: string }) {
  const { data: segments = [], isLoading } = useMarketingSegments(storeId);
  const del = useDeleteSegment(storeId);
  const refresh = useRefreshSegmentCount(storeId);
  const [editing, setEditing] = useState<SegmentDef | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = segments.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Audience segments</h3>
          <p className="text-[11px] text-muted-foreground">{segments.length} saved</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-1" /> New segment
        </Button>
      </div>

      <Input
        placeholder="Search segments..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9"
      />

      {isLoading ? (
        <div className="text-xs text-muted-foreground py-8 text-center">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium">No segments yet</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Create a segment to target customers in campaigns.
            </p>
            <Button size="sm" className="mt-3" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4 mr-1" /> Create your first segment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <Card key={s.id} className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold truncate">{s.name}</h4>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                      {s.member_count.toLocaleString()} members
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {s.last_refreshed_at
                      ? `Refreshed ${formatDistanceToNow(parseISO(s.last_refreshed_at), { addSuffix: true })}`
                      : "Never refreshed"}
                  </p>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => refresh.mutate(s)} disabled={refresh.isPending}>
                  <RefreshCw className={`w-3.5 h-3.5 ${refresh.isPending ? "animate-spin" : ""}`} />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(s)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => del.mutate(s.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SegmentBuilder
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        storeId={storeId}
        segment={editing}
      />
    </div>
  );
}
