import { Capacitor } from "@capacitor/core";

const STANDALONE_DISPLAY_QUERY = "(display-mode: standalone)";

type IOSStandaloneNavigator = Navigator & {
  standalone?: boolean;
};

export const isZivoInstalledShell = () => {
  const isStandaloneDisplay =
    typeof window !== "undefined" &&
    ((window.matchMedia?.(STANDALONE_DISPLAY_QUERY).matches ?? false) ||
      (window.navigator as IOSStandaloneNavigator).standalone === true);

  return Capacitor.isNativePlatform() || isStandaloneDisplay;
};

/**
 * Installed apps need the conservative notch/Dynamic Island fallback, while a
 * normal mobile browser should use only its real CSS safe-area inset. Keeping
 * that decision here prevents each Travel shell from inventing a different
 * top offset.
 */
export const getZivoHeaderSafeTop = (webFloor = "0.5rem") => {
  return isZivoInstalledShell()
    ? "var(--zivo-safe-top-sticky)"
    : `max(var(--zivo-safe-top, 0px), ${webFloor})`;
};
