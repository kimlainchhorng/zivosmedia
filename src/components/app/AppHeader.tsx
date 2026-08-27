/**
 * App Header Component
 * Mobile-first header with logo, city selector, and notifications
 */
import { Link, useNavigate } from "react-router-dom";
import { Bell, ChevronLeft } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import ZivoTravelLogo from "@/components/ZivoTravelLogo";
// CitySelector removed
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { isZivoTravelHost } from "@/config/zivoTravelDomain";
import { getZivoHeaderSafeTop } from "@/lib/zivoHeaderSafeArea";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  transparent?: boolean;
  rightAction?: React.ReactNode;
  hideLocation?: boolean;
}

const AppHeader = ({ 
  title, 
  showBack = false, 
  onBack, 
  transparent = false,
  rightAction,
  hideLocation = false
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications(20);
  const isTravel = typeof window !== "undefined" && isZivoTravelHost();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      style={{ paddingTop: getZivoHeaderSafeTop("0.4375rem") }}
      className={cn(
        "zivo-safe-top-guard-off fixed top-0 left-0 right-0 z-50 transition-all duration-200 tap-highlight-none no-select",
        transparent ? "bg-transparent" : "bg-card/95 backdrop-blur-md border-b border-border/50"
      )}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left */}
        {showBack ? (
          <button type="button"
            onClick={handleBack}
            className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center hover:bg-muted transition-all active:scale-90 touch-manipulation min-w-[44px] min-h-[44px]"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : (
          <Link
            to="/"
            aria-label={isTravel ? "Zivo Travel home" : "ZIVO home"}
            className="rounded-lg active:scale-95 transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {isTravel ? <ZivoTravelLogo size="sm" /> : <BrandLogo size="sm" />}
          </Link>
        )}

        {/* Center - Title or City Selector */}
        {title ? (
          <h1 className="font-bold text-lg absolute left-1/2 -translate-x-1/2">
            {title}
          </h1>
        ) : !hideLocation && (
          <span className="text-sm text-muted-foreground">ZIVO</span>
        )}

        {/* Right - Notifications Bell */}
        {rightAction || (isTravel && showBack ? (
          <Link
            to="/"
            aria-label="Zivo Travel home"
            className="grid h-10 w-10 -mr-2 place-items-center rounded-xl transition-all active:scale-90 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ZivoTravelLogo size="sm" showWordmark={false} />
          </Link>
        ) : (
          <button type="button"
            onClick={() => navigate("/notifications")}
            className="relative w-10 h-10 -mr-2 rounded-xl flex items-center justify-center hover:bg-muted transition-all active:scale-90 touch-manipulation min-w-[44px] min-h-[44px]"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </header>
  );
};

export default AppHeader;
