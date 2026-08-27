/**
 * App Layout
 * Mobile-first shell with header and bottom navigation
 */
import type { ReactNode } from "react";
import ZivoMobileNav from "./ZivoMobileNav";
import AppHeader from "./AppHeader";
import SystemStatusBanner from "@/components/shared/SystemStatusBanner";
import OfflineBanner from "@/components/shared/OfflineBanner";
import SafeAreaDebugOverlay from "@/components/dev/SafeAreaDebugOverlay";
import Footer from "@/components/Footer";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/lib/utils";
import { isZivoTravelHost } from "@/config/zivoTravelDomain";
import { getZivoHeaderSafeTop } from "@/lib/zivoHeaderSafeArea";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  hideNav?: boolean;
  hideHeader?: boolean;
  transparentHeader?: boolean;
  headerRightAction?: ReactNode;
  className?: string;
  fixedHeight?: boolean;
  showTravelFooter?: boolean;
}

const AppLayout = ({
  children,
  title,
  showBack = false,
  onBack,
  hideNav = false,
  hideHeader = false,
  transparentHeader = false,
  headerRightAction,
  className,
  fixedHeight = false,
  showTravelFooter = false,
}: AppLayoutProps) => {
  const { isOnline } = useNetworkStatus();
  const isTravel = typeof window !== "undefined" && isZivoTravelHost();
  const headerSafeTop = getZivoHeaderSafeTop("0.4375rem");

  return (
    <SwipeBackContainer
      disabled={!showBack}
      onBack={onBack}
      className={cn(
        "bg-background flex flex-col overscroll-none tap-highlight-none",
        fixedHeight ? "h-[100dvh] overflow-hidden" : "min-h-screen"
      )}
    >
      {!hideHeader && (
        <AppHeader
          title={title}
          showBack={showBack}
          onBack={onBack}
          transparent={transparentHeader}
          rightAction={headerRightAction}
        />
      )}

      {/* System Status Banner (customer-facing) */}
      <SystemStatusBanner />

      {/* Offline Banner */}
      <OfflineBanner isOffline={!isOnline} />

      <main
        className={cn(
          "flex-1",
          fixedHeight ? "min-h-0 overflow-hidden flex flex-col" : "scroll-momentum overscroll-contain",
          !hideNav && "pb-nav",
          className
        )}
        style={
          !hideHeader
            ? { paddingTop: `calc(57px + ${headerSafeTop})` }
            : { paddingTop: "var(--zivo-safe-top,0px)" }
        }
      >
        {children}
      </main>

      {showTravelFooter && isTravel && (
        <Footer forceTravelBrand className="pb-[calc(6rem+env(safe-area-inset-bottom))]" />
      )}

      {!hideNav && <ZivoMobileNav />}

      <SafeAreaDebugOverlay />
    </SwipeBackContainer>
  );
};

export default AppLayout;
