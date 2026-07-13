import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { withRedirectParam } from "@/lib/authRedirect";
import { ChevronDown, ArrowRight, X, Car, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { megaMenuData, moreServicesData } from "./megaMenuData";
import type { MegaMenuData } from "./megaMenuData";
import ZivoLogo from "@/components/ZivoLogo";
import CurrencySelector from "@/components/shared/CurrencySelector";

interface MobileNavMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  signOut: () => void;
}

const MobileNavSection = ({ 
  data, 
  onNavigate 
}: { 
  data: MegaMenuData; 
  onNavigate: (href: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              data.id === "rides" && "gradient-rides",
              data.id === "eats" && "gradient-eats",
              data.id === "flights" && "bg-sky-500",
              data.id === "hotels" && "bg-amber-500",
              data.id === "car-rental" && "bg-primary",
              data.id === "more" && "bg-muted"
            )}>
              <data.icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <span className="font-medium text-foreground">{data.label}</span>
              <p className="text-xs text-muted-foreground">{data.description}</p>
            </div>
          </div>
          <ChevronDown className={cn(
            "w-5 h-5 text-muted-foreground transition-transform",
            isExpanded && "rotate-180"
          )} />
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="py-3 pl-4 space-y-4">
          {/* Main Action */}
          <Button
            variant="hero"
            size="sm"
            onClick={() => onNavigate(data.mainAction.href)}
            className="w-full gap-2"
          >
            {data.mainAction.label}
            <ArrowRight className="w-4 h-4" />
          </Button>

          {/* Sections */}
          {data.sections.map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {section.title}
              </h4>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button type="button"
                    key={item.label}
                    onClick={() => onNavigate(item.href)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <item.icon className={cn("w-4 h-4", item.color)} />
                    <span className="flex-1 text-sm text-foreground">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-primary/10 text-primary">
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Policies */}
          <div className="pt-2 border-t border-border/50">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Policies & Help
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.policies.map((policy) => (
                <button type="button"
                  key={policy.label}
                  onClick={() => onNavigate(policy.href)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <policy.icon className="w-3 h-3" />
                  {policy.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const MobileNavMenu = ({ isOpen, onClose, user, signOut }: MobileNavMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (href: string) => {
    navigate(href);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" role="button" tabIndex={0} aria-label="Close menu" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }} />
      
      {/* Menu Panel */}
      <div className="absolute right-0 top-0 h-full w-full sm:max-w-md bg-card border-l border-border shadow-2xl animate-slide-in-right safe-area-inset flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ZivoLogo size="sm" />
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {/* Main Services */}
            {megaMenuData.map((data) => (
              <MobileNavSection key={data.id} data={data} onNavigate={handleNavigate} />
            ))}

            {/* More Services */}
            <MobileNavSection data={moreServicesData} onNavigate={handleNavigate} />

            {/* User Section */}
            {user && (
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Your Account
                </h4>
                <div className="space-y-1">
                  <button type="button"
                    onClick={() => handleNavigate("/profile")}
                    className="w-full text-left py-2 text-foreground font-medium"
                  >
                    Profile Settings
                  </button>
                  <button type="button"
                    onClick={() => handleNavigate("/app")}
                    className="w-full text-left py-2 text-foreground font-medium"
                  >
                    My Dashboard
                  </button>
                  <button type="button"
                    onClick={() => handleNavigate("/trips")}
                    className="w-full text-left py-2 text-foreground font-medium"
                  >
                    Trip History
                  </button>
                </div>
              </div>
            )}

            {/* Become a Driver Section */}
            <div className="mt-4 pt-4 border-t border-border">
              <button type="button"
                onClick={() => {
                  navigate("/drive");
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-rides/10 to-teal-500/10 border border-rides/20 hover:bg-rides/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl gradient-rides flex items-center justify-center">
                  <Car className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-foreground block">Become a Driver</span>
                  <span className="text-xs text-muted-foreground">Earn money on your schedule</span>
                </div>
                <ArrowRight className="w-5 h-5 text-rides" />
              </button>
            </div>

            {/* Currency Selector */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Currency</span>
                </div>
                <CurrencySelector variant="compact" />
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions (always visible) */}
        <div className="p-4 pb-safe bg-card border-t border-border">
          {user ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                signOut();
                onClose();
              }}
            >
              Sign out
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => handleNavigate(withRedirectParam("/login", location.pathname === "/" ? null : `${location.pathname}${location.search ?? ""}`))}>
                Log in
              </Button>
              <Button variant="hero" className="flex-1" onClick={() => handleNavigate("/signup")}>
                Sign up
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileNavMenu;
