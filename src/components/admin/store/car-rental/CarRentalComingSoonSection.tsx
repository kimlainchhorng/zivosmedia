/**
 * CarRentalComingSoonSection — placeholder for car-rental tabs that don't yet
 * have a real implementation. Mirrors SalonComingSoonSection.
 */
import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

interface CarRentalComingSoonSectionProps {
  title: string;
  description?: string;
  Icon?: LucideIcon;
  bullets?: string[];
}

export default function CarRentalComingSoonSection({
  title, description, Icon = Sparkles, bullets,
}: CarRentalComingSoonSectionProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 sm:p-10">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3 w-3" /> Coming soon
          </span>
        </div>
      </div>

      {bullets && bullets.length > 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            What you'll be able to do here
          </p>
          <ul className="space-y-1.5 text-sm text-foreground/85">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
