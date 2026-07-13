import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const goTab = (tab: string) => window.dispatchEvent(new CustomEvent("lodge-set-tab", { detail: { tab } }));

export default function LodgingSectionStatusBanner({
  title,
  icon: Icon,
  countLabel,
  countValue,
  setupLabel = "Ready for hotel data",
  fixLabel,
  fixTab,
}: {
  title: string;
  icon: LucideIcon;
  countLabel: string;
  countValue: number | string;
  setupLabel?: string;
  fixLabel: string;
  fixTab: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-foreground">{title}</p>
              <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Section installed</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{setupLabel} · {countLabel}: <span className="font-semibold text-foreground">{countValue}</span></p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => goTab(fixTab)}>{fixLabel}</Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/admin/lodging/qa-checklist")}><ListChecks className="mr-2 h-4 w-4" /> QA</Button>
        </div>
      </div>
    </div>
  );
}