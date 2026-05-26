/**
 * Interactive car-silhouette damage diagram for the Returns dialog.
 *
 * Click the diagram to drop a damage mark. Click an existing mark to remove it.
 * Marks are stored as { x, y, severity, note? } with x/y in [0, 100] (percent).
 */
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface DamageMark {
  x: number;       // 0–100
  y: number;       // 0–100
  severity: "minor" | "major";
  note?: string;
}

interface Props {
  marks: DamageMark[];
  onChange: (marks: DamageMark[]) => void;
}

export default function CarRentalDamageDiagram({ marks, onChange }: Props) {
  const [severity, setSeverity] = useState<"minor" | "major">("minor");

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    // viewBox is 0 0 200 100
    const xPct = (local.x / 200) * 100;
    const yPct = (local.y / 100) * 100;
    if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) return;
    onChange([...marks, { x: xPct, y: yPct, severity }]);
  };

  const removeMark = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(marks.filter((_, j) => j !== i));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-foreground/80">Mark damage:</span>
        <button type="button" onClick={() => setSeverity("minor")} className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
          severity === "minor" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40" : "border-border text-muted-foreground"
        )}>Minor</button>
        <button type="button" onClick={() => setSeverity("major")} className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
          severity === "major" ? "bg-destructive/15 text-destructive border-destructive/40" : "border-border text-muted-foreground"
        )}>Major</button>
        {marks.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="ml-auto text-[11px] text-muted-foreground underline hover:text-foreground">
            Clear all
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
        <svg
          viewBox="0 0 200 100"
          xmlns="http://www.w3.org/2000/svg"
          className="block h-44 w-full cursor-crosshair"
          onClick={handleClick}
        >
          {/* Top-down car silhouette */}
          <g fill="hsl(var(--muted))" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5">
            {/* Body */}
            <rect x="20" y="25" width="160" height="50" rx="14" />
            {/* Hood */}
            <rect x="22" y="30" width="35" height="40" rx="6" />
            {/* Trunk */}
            <rect x="143" y="30" width="35" height="40" rx="6" />
            {/* Roof / cabin */}
            <rect x="60" y="35" width="80" height="30" rx="4" fill="hsl(var(--muted) / 0.4)" />
            {/* Windshield */}
            <line x1="60" y1="35" x2="55" y2="30" />
            <line x1="60" y1="65" x2="55" y2="70" />
            <line x1="140" y1="35" x2="145" y2="30" />
            <line x1="140" y1="65" x2="145" y2="70" />
            {/* Wheels */}
            <rect x="35" y="20" width="20" height="6" rx="2" fill="hsl(var(--foreground) / 0.4)" />
            <rect x="35" y="74" width="20" height="6" rx="2" fill="hsl(var(--foreground) / 0.4)" />
            <rect x="145" y="20" width="20" height="6" rx="2" fill="hsl(var(--foreground) / 0.4)" />
            <rect x="145" y="74" width="20" height="6" rx="2" fill="hsl(var(--foreground) / 0.4)" />
            {/* Headlights */}
            <circle cx="24" cy="38" r="1.5" fill="hsl(var(--foreground) / 0.4)" />
            <circle cx="24" cy="62" r="1.5" fill="hsl(var(--foreground) / 0.4)" />
            <circle cx="176" cy="38" r="1.5" fill="hsl(var(--foreground) / 0.4)" />
            <circle cx="176" cy="62" r="1.5" fill="hsl(var(--foreground) / 0.4)" />
          </g>

          {/* Labels */}
          <text x="100" y="14" textAnchor="middle" className="fill-muted-foreground" fontSize="6" fontWeight="bold">FRONT</text>
          <text x="100" y="96" textAnchor="middle" className="fill-muted-foreground" fontSize="6" fontWeight="bold">REAR</text>

          {/* Damage marks */}
          {marks.map((m, i) => (
            <g key={i} transform={`translate(${(m.x / 100) * 200} ${(m.y / 100) * 100})`}>
              <circle
                r="4"
                className={cn(
                  m.severity === "major" ? "fill-destructive" : "fill-amber-500",
                  "stroke-white"
                )}
                strokeWidth="1"
                onClick={(e) => removeMark(i, e)}
                style={{ cursor: "pointer" }}
              />
              <text textAnchor="middle" y="2" fontSize="5" fontWeight="bold" className="pointer-events-none fill-white">{i + 1}</text>
            </g>
          ))}
        </svg>
      </div>

      <p className="text-[10px] text-muted-foreground">
        {marks.length === 0
          ? "Tap the diagram to mark damage. Click an existing mark to remove it."
          : `${marks.length} mark${marks.length === 1 ? "" : "s"} · ${marks.filter((m) => m.severity === "major").length} major / ${marks.filter((m) => m.severity === "minor").length} minor`
        }
      </p>
    </div>
  );
}
