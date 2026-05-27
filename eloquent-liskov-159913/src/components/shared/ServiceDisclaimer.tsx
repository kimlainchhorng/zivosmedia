import { ExternalLink, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type ServiceType = "travel" | "local";

interface ServiceDisclaimerProps {
  type: ServiceType;
  className?: string;
}

const disclaimers = {
  travel: {
    icon: ExternalLink,
    text: "Travel bookings are completed through licensed travel partners. ZIVO does not issue airline tickets directly.",
    accentColor: "text-sky-500",
    borderColor: "border-sky-500/20",
    bgColor: "bg-sky-500/5",
  },
  local: {
    icon: Users,
    text: "Transportation and delivery services are provided by independent drivers using the ZIVO platform.",
    accentColor: "text-emerald-500",
    borderColor: "border-emerald-500/20",
    bgColor: "bg-emerald-500/5",
  },
};

export default function ServiceDisclaimer({ type, className }: ServiceDisclaimerProps) {
  const config = disclaimers[type];
  const Icon = config.icon;

  return (
    <section className={cn("py-6 border-y", config.borderColor, config.bgColor, className)}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Icon className={cn("w-4 h-4 shrink-0", config.accentColor)} />
          <span className="text-center">{config.text}</span>
        </div>
      </div>
    </section>
  );
}
