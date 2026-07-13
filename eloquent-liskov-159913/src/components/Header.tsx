import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, User, Search, Sparkles, ChevronDown, Car, ShieldCheck, Plane, Hotel, Globe, Check } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MobileNavMenu from "./navigation/MobileNavMenu";
import { cn } from "@/lib/utils";
import ZivoLogo from "./ZivoLogo";
import CurrencySelector from "./shared/CurrencySelector";
import BetaBadge from "./shared/BetaBadge";

import { NotificationBell } from "./notifications/NotificationBell";
import { PremiumSearchOverlay } from "@/components/search";
import { Capacitor } from "@capacitor/core";
import { useI18n } from "@/hooks/useI18n";
import { useSupportedLanguages } from "@/hooks/useGlobalExpansion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ─── Flat IG-style nav link ─── */
interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

function NavLinkItem({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold text-foreground hover:bg-secondary transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{item.label}</span>
    </Link>
  );
}

const Header = () => {
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const { currentLanguage, changeLanguage, t } = useI18n();
  const { data: supportedLanguages } = useSupportedLanguages(true);
  const activeLanguages = (supportedLanguages || []).filter(l => l.is_active);
  const currentLangData = activeLanguages.find(l => l.code === currentLanguage);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border safe-area-top">
        {/* IG gradient accent — hairline beneath the header */}
        <div aria-hidden className="bg-ig-gradient absolute left-0 right-0 bottom-0 h-px opacity-80" />
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center gap-3 h-11 sm:h-12">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div 
                className="cursor-pointer transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]" 
                onClick={() => navigate("/")}
              >
                <ZivoLogo size="sm" />
              </div>
              <BetaBadge variant="compact" className="hidden sm:flex" />
            </div>

            {/* Desktop Navigation - Simple Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {([
                { label: "Flights", href: "/flights", icon: Plane },
                { label: "Hotels", href: "/hotels", icon: Hotel },
                { label: "Car Rental", href: "/car-rental", icon: Car },
              ] as const).map((item) => (
                <NavLinkItem key={item.href} item={item} />
              ))}
            </nav>

            {/* Desktop Actions - Enhanced */}
            <div className="hidden md:flex items-center gap-1 ml-auto">
              {/* Language Selector */}
              <Popover open={isLangOpen} onOpenChange={setIsLangOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 px-2.5 h-8 font-semibold rounded-xl text-foreground hover:bg-secondary"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {currentLangData?.flag_svg ? (
	                      <img
	                        src={currentLangData.flag_svg}
	                        alt=""
	                        className="w-5 h-3.5 rounded-[2px] object-cover border border-border"
	                        loading="eager"
	                        decoding="async"
	                      />
                    ) : (
                      <span className="text-xs">{currentLangData?.flag_emoji || "🌐"}</span>
                    )}
                    <span className="text-xs font-bold">{currentLanguage.toUpperCase()}</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isLangOpen && "rotate-180")} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0 bg-card border border-border rounded-2xl overflow-hidden" align="end" sideOffset={8}>
                  <div className="p-3 border-b border-border bg-secondary">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm font-medium">{t("lang.select")}</p>
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[360px] p-1">
                    {activeLanguages.map((lang) => (
                      <button type="button"
                        key={lang.code}
                        onClick={() => { changeLanguage(lang.code); setIsLangOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                          currentLanguage === lang.code ? "bg-secondary text-foreground" : "hover:bg-secondary"
                        )}
                      >
                        {lang.flag_svg ? (
	                          <img
	                            src={lang.flag_svg}
	                            alt={lang.name}
	                            className="w-6 h-[17px] rounded-[3px] object-cover border border-border shrink-0"
	                            loading="lazy"
	                            decoding="async"
	                          />
                        ) : (
                          <span className="text-lg">{lang.flag_emoji}</span>
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm">{lang.name}</p>
                          <p className="text-xs text-muted-foreground">{lang.native_name}</p>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">{lang.code}</span>
                        {currentLanguage === lang.code && <Check className="w-4 h-4 text-foreground" />}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Currency Selector */}
              <CurrencySelector variant="compact" />


              {user ? (
                <>
                  {/* Notifications - Real-time */}
                  <NotificationBell />

                  {/* User Menu - Enhanced */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5 ml-1 rounded-xl hover:bg-secondary px-2 h-8">
                        <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center">
                          <User className="h-3 w-3 text-foreground" />
                        </div>
                        <span className="hidden lg:inline text-[13px] font-semibold">Account</span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden lg:block" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 bg-card border border-border rounded-2xl p-2">
                      <div className="px-3 py-3 mb-2 rounded-xl bg-secondary border border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center">
                            <User className="h-5 w-5 text-background" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">Welcome back!</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer rounded-xl py-2.5 font-medium">
                        Profile Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/app")} className="cursor-pointer rounded-xl py-2.5 font-medium">
                        My Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/trips")} className="cursor-pointer rounded-xl py-2.5 font-medium">
                        Trip History
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/promotions")} className="cursor-pointer rounded-xl py-2.5 font-medium">
                        <Sparkles className="w-4 h-4 mr-2 text-eats" />
                        Rewards & Promotions
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-2" />
                      <DropdownMenuItem 
                        onClick={() => navigate("/drive")} 
                        className="cursor-pointer rounded-xl py-2.5 font-medium"
                      >
                        <Car className="w-4 h-4 mr-2 text-rides" />
                        Become a Driver
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/eats")} className="cursor-pointer rounded-xl py-2.5 font-medium">
                        Restaurant Partner
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-2" />
                      <DropdownMenuItem onClick={() => navigate("/help")} className="cursor-pointer rounded-xl py-2.5 font-medium">
                        Help Center
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer rounded-xl py-2.5 font-medium">
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/drive")}
                    className="rounded-xl font-semibold gap-1.5"
                  >
                    <Car className="w-4 h-4" />
                    Drive with us
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="rounded-xl font-semibold">
                    Log in
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/signup")}
                    className="bg-ig-gradient hover:opacity-90 text-white rounded-xl font-bold border-0 shadow-sm"
                  >
                    Sign up free
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button type="button"
              className="lg:hidden p-2.5 -mr-2 ml-auto text-foreground hover:bg-secondary rounded-xl transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Premium Search Overlay */}
        <PremiumSearchOverlay 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
        />
      </header>

      {/* Mobile Navigation Menu */}
      <MobileNavMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={user}
        signOut={signOut}
      />
    </>
  );
};

// Desktop chrome — hamburger, dropdown menus, currency/language selectors,
// search overlay. On native iOS/Android the bottom tab bar already handles
// primary navigation, so render nothing instead of stealing screen real
// estate. Wrapped at the export boundary so the inner component's hooks
// always run consistently (rules-of-hooks).
const HeaderWrapper = () => {
  if (Capacitor.isNativePlatform()) return null;
  return <Header />;
};

export default HeaderWrapper;
