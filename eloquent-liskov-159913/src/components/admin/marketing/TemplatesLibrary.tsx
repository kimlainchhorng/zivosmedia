/**
 * TemplatesLibrary — Reusable creatives by channel with usage count.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Edit, Trash2, Bell, Mail, MessageSquare, Smartphone, Image as ImageIcon } from "lucide-react";
import { useMarketingTemplates, useDeleteTemplate, type MarketingTemplate } from "@/hooks/useMarketingTemplates";
import TemplateEditor from "./TemplateEditor";
import { formatDistanceToNow, parseISO } from "date-fns";

const CH_ICON: Record<string, any> = {
  push: Bell, email: Mail, sms: MessageSquare, inapp: Smartphone, ad: ImageIcon,
};
const CH_TONE: Record<string, string> = {
  push: "bg-blue-500/10 text-blue-600",
  email: "bg-violet-500/10 text-violet-600",
  sms: "bg-emerald-500/10 text-emerald-600",
  inapp: "bg-amber-500/10 text-amber-600",
  ad: "bg-rose-500/10 text-rose-600",
};

export default function TemplatesLibrary({ storeId }: { storeId: string }) {
  const [channel, setChannel] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<MarketingTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: templates = [], isLoading } = useMarketingTemplates(storeId, channel === "all" ? undefined : channel);
  const del = useDeleteTemplate(storeId);

  const filtered = templates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Template library</h3>
          <p className="text-[11px] text-muted-foreground">{templates.length} templates</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-1" /> New template
        </Button>
      </div>

      <Tabs value={channel} onValueChange={setChannel}>
        <TabsList className="h-8">
          <TabsTrigger value="all" className="h-7 text-xs">All</TabsTrigger>
          <TabsTrigger value="push" className="h-7 text-xs">Push</TabsTrigger>
          <TabsTrigger value="email" className="h-7 text-xs">Email</TabsTrigger>
          <TabsTrigger value="sms" className="h-7 text-xs">SMS</TabsTrigger>
          <TabsTrigger value="inapp" className="h-7 text-xs">In-app</TabsTrigger>
          <TabsTrigger value="ad" className="h-7 text-xs">Ad</TabsTrigger>
        </TabsList>
      </Tabs>

      <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />

      {isLoading ? (
        <div className="text-xs text-muted-foreground py-8 text-center">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium">No templates yet</p>
            <p className="text-[11px] text-muted-foreground mt-1">Save reusable content for faster campaigns.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map((t) => {
            const Icon = CH_ICON[t.channel] || FileText;
            return (
              <Card key={t.id} className="p-3 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${CH_TONE[t.channel]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-semibold truncate">{t.name}</h4>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5 capitalize">{t.channel}</Badge>
                    </div>
                    {t.subject && <p className="text-[11px] text-muted-foreground truncate">{t.subject}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Used {t.usage_count}× {t.last_used_at ? `· ${formatDistanceToNow(parseISO(t.last_used_at), { addSuffix: true })}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(t)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del.mutate(t.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <TemplateEditor
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        storeId={storeId}
        template={editing}
      />
    </div>
  );
}
