import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";

interface NativeBackButtonProps {
  /** Where to navigate. Defaults to home ("/"). Pass -1 to use browser history. */
  to?: string | -1;
}

/**
 * NativeBackButton — small floating back affordance for category-hub pages
 * on iOS/Android. Renders nothing on web (the desktop NavBar/Header already
 * provides navigation). Sits in the top-left safe area; non-blocking
 * pointer-events outside the button itself so the page below is still
 * scrollable through this region.
 */
export default function NativeBackButton({ to = "/" }: NativeBackButtonProps) {
  const navigate = useNavigate();
  if (!Capacitor.isNativePlatform()) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-30 safe-area-top pointer-events-none">
      <div className="px-3 pt-2 pointer-events-auto inline-block">
        <button type="button"
          onClick={() => (to === -1 ? navigate(-1) : navigate(to))}
          aria-label="Back"
          className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-md border border-border/40 flex items-center justify-center shadow-sm touch-manipulation active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </div>
  );
}
