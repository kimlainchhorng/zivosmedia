import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import type { MegaMenuData } from "./megaMenuData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MegaMenuDropdownProps {
  data: MegaMenuData;
}

const MegaMenuDropdown = ({ data }: MegaMenuDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getGradientClass = () => {
    switch (data.id) {
      case "rides": return "from-rides/20 to-teal-500/10";
      case "eats": return "from-eats/20 to-orange-400/10";
      case "flights": return "from-sky-500/20 to-blue-400/10";
      case "hotels": return "from-amber-500/20 to-yellow-400/10";
      case "car-rental": return "from-primary/20 to-teal-400/10";
      default: return "from-muted-foreground/20 to-muted/10";
    }
  };

  const getAccentColor = () => {
    switch (data.id) {
      case "rides": return "bg-gradient-to-br from-rides to-teal-400";
      case "eats": return "bg-gradient-to-br from-eats to-orange-400";
      case "flights": return "bg-gradient-to-br from-sky-500 to-blue-400";
      case "hotels": return "bg-gradient-to-br from-amber-500 to-yellow-400";
      case "car-rental": return "bg-gradient-to-br from-primary to-teal-400";
      default: return "bg-gradient-to-br from-muted-foreground to-muted";
    }
  };

  const getGlowColor = () => {
    switch (data.id) {
      case "rides": return "shadow-rides/30";
      case "eats": return "shadow-eats/30";
      case "flights": return "shadow-sky-500/30";
      case "hotels": return "shadow-amber-500/30";
      case "car-rental": return "shadow-primary/30";
      default: return "shadow-muted-foreground/20";
    }
  };

  return (
    <div
      ref={menuRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Button - CSS transitions instead of Framer Motion */}
      <button type="button"
        className={cn(
          "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden",
          "hover:scale-[1.02] active:scale-[0.98]",
          isOpen
            ? `${data.color} bg-muted/80 shadow-lg`
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        {isOpen && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-in fade-in duration-200" />
        )}
        <data.icon className={cn("w-4 h-4 relative z-10", isOpen && data.color)} />
        <span className="relative z-10">{data.label}</span>
        <ChevronDown 
          className={cn(
            "w-4 h-4 relative z-10 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {/* Dropdown Panel - CSS transitions */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className={cn(
            "bg-card/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative",
            `shadow-xl ${getGlowColor()}`,
            data.sections.length > 2 ? "w-[920px]" : "w-[760px]"
          )}>
            {/* Static background gradient */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none",
              getGradientClass()
            )} />

            {/* Header Bar */}
            <div className="relative px-6 py-5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                    getAccentColor()
                  )}>
                    <data.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                      ZIVO {data.label}
                      <Sparkles className="w-4 h-4 text-primary" />
                    </h3>
                    <p className="text-sm text-muted-foreground">{data.description}</p>
                  </div>
                </div>
                <Link to={data.mainAction.href}>
                  <Button 
                    variant="hero" 
                    size="sm" 
                    className="gap-2 rounded-xl shadow-lg shadow-primary/20 group hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    {data.mainAction.label}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Content Grid - Dynamic based on sections */}
            <div className="relative p-6">
              <div className={cn(
                "grid gap-8",
                data.sections.length > 2 ? "grid-cols-4" : "grid-cols-2"
              )}>
                {data.sections.map((section) => (
                  <div key={section.title}>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                      <span className="w-6 h-px bg-gradient-to-r from-primary/50 to-transparent" />
                      {section.title}
                    </h4>
                    <div className="space-y-1.5">
                      {section.items.map((item) => (
                        <Link key={item.label} to={item.href}>
                          <div className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 group cursor-pointer relative overflow-hidden border border-transparent hover:border-white/10 hover:bg-white/5 hover:translate-x-0.5">
                            {/* Icon container */}
                            <div className={cn(
                              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                              "bg-gradient-to-br from-muted/90 to-muted/50 border border-white/10",
                              "group-hover:border-primary/30 group-hover:shadow-md group-hover:shadow-primary/20",
                              "transition-all duration-200",
                              item.color || "text-muted-foreground"
                            )}>
                              <item.icon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                            </div>
                            
                            {/* Text content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors duration-200 truncate">
                                  {item.label}
                                </span>
                                {item.badge && (
                                  <Badge className={cn(
                                    "text-[9px] px-1.5 py-0 h-4 border-0 shadow-md font-bold uppercase tracking-wide",
                                    item.badge === "New" && "bg-gradient-to-r from-emerald-500 to-teal-500 text-primary-foreground shadow-emerald-500/40",
                                    item.badge === "Hot" && "bg-gradient-to-r from-rose-500 to-orange-500 text-primary-foreground shadow-rose-500/40",
                                    item.badge === "Save" && "bg-gradient-to-r from-amber-500 to-yellow-500 text-primary-foreground shadow-amber-500/40",
                                    item.badge === "Popular" && "bg-gradient-to-r from-sky-500 to-blue-500 text-primary-foreground shadow-sky-500/40",
                                    item.badge === "Green" && "bg-gradient-to-r from-emerald-500 to-green-500 text-primary-foreground shadow-emerald-500/40",
                                    !["New", "Hot", "Save", "Popular", "Green"].includes(item.badge || "") && "bg-gradient-to-r from-primary to-teal-500 text-primary-foreground shadow-primary/40"
                                  )}>
                                    {item.badge}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground/70 line-clamp-1 group-hover:text-muted-foreground transition-colors duration-200">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Policy Links Footer */}
            <div className="relative px-6 py-3.5 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {data.policies.slice(0, 5).map((policy) => (
                    <Link key={policy.label} to={policy.href}>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group">
                        <policy.icon className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                        <span className="group-hover:underline underline-offset-2">{policy.label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link to="/help">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium">
                    <span>View all</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MegaMenuDropdown;
