import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";

interface NativeBackButtonProps {
  /** Where to navigate. Defaults to home ("/"). Pass -1 to use browser history. */
  to?: string | -1;
  /** Accessible name for the icon-only control. */
  label?: string;
}

/**
 * NativeBackButton — small floating back affordance for category-hub pages
 * on iOS/Android. Renders nothing on web (the desktop NavBar/Header already
 * provides navigation). Sits in the top-left safe area; non-blocking
 * pointer-events outside the button itself so the page below is still
 * scrollable through this region.
 */
export default function NativeBackButton({
  to = "/",
  label = "Back to ZIVO Home",
}: NativeBackButtonProps) {
  const navigate = useNavigate();
  if (!Capacitor.isNativePlatform()) return null;

  const handleBack = () => {
    if (to === -1) {
      navigate(-1);
      return;
    }

    navigate(to, { replace: to === "/" });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] safe-area-top pointer-events-none">
      <div className="px-3 pt-2 pointer-events-auto inline-block">
        <button
          type="button"
          onClick={handleBack}
          aria-label={label}
          className="flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-full border border-border/40 bg-card/90 shadow-sm backdrop-blur-md transition-transform touch-manipulation active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </div>
  );
}
