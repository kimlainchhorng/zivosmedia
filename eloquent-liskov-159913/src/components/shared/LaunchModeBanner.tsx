/**
 * Launch Mode Banner
 * Displays current launch phase to users (soft launch, invite-only, etc.)
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Rocket, 
  Sparkles, 
  Users, 
  X,
  Info,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

type LaunchMode = "pre_launch" | "soft_launch" | "full_launch";

interface LaunchModeBannerProps {
  mode?: LaunchMode;
  className?: string;
}

const launchConfig = {
  pre_launch: {
    icon: Users,
    title: "Invite-Only Access",
    message: "ZIVO is currently invite-only. Request access to join early.",
    cta: "Request Access",
    ctaLink: "/waitlist",
    color: "from-violet-500/20 to-purple-500/10",
    borderColor: "border-violet-500/30",
    textColor: "text-violet-500",
  },
  soft_launch: {
    icon: Sparkles,
    title: "ZIVO is Live",
    message: "Prices provided by trusted travel partners.",
    cta: "",
    ctaLink: "",
    color: "from-emerald-500/20 to-teal-500/10",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-500",
  },
  full_launch: {
    icon: Rocket,
    title: "",
    message: "",
    cta: "",
    ctaLink: "",
    color: "",
    borderColor: "",
    textColor: "",
  },
};

const LaunchModeBanner = ({ 
  mode = "soft_launch", 
  className 
}: LaunchModeBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner for full launch
  if (mode === "full_launch" || isDismissed) {
    return null;
  }

  const config = launchConfig[mode];
  const Icon = config.icon;

  return (
    <div className={cn(
      "relative bg-gradient-to-r py-2 px-4 border-b",
      config.color,
      config.borderColor,
      className
    )}>
      <div className="container mx-auto flex items-center justify-center gap-3 text-sm">
        <Icon className={cn("w-4 h-4 flex-shrink-0", config.textColor)} />
        <span className="font-medium">{config.title}</span>
        <span className="text-muted-foreground hidden sm:inline">—</span>
        <span className="text-muted-foreground hidden sm:inline">{config.message}</span>
        {config.cta && (
          <Link 
            to={config.ctaLink}
            className={cn(
              "font-semibold hover:underline inline-flex items-center gap-1 ml-2",
              config.textColor
            )}
          >
            {config.cta}
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
        <button type="button"
          onClick={() => setIsDismissed(true)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-background/50 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default LaunchModeBanner;
