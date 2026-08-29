import { SOCIAL_ROUTE_PATHS } from "@/lib/socialRoutes";

export const getZivoMobileNavActiveTab = (path: string, isTravel: boolean) => {
  if (isTravel) {
    const normalizedPath = path.length > 1 ? path.replace(/\/+$/, "") : path;
    const travelPath = normalizedPath.startsWith("/zivo-travel/")
      ? normalizedPath.slice("/zivo-travel".length)
      : normalizedPath;

    if (normalizedPath === "/" || normalizedPath === "/zivo-travel")
      return "home";
    if (travelPath.startsWith("/my-trips")) return "trips";
    if (travelPath.startsWith("/wallet")) return "wallet";
    if (travelPath.startsWith("/payment-methods")) return "cards";
    if (travelPath.startsWith("/account")) return "account";

    // Booking and browsing pages are not the Travel front door. Leaving every
    // tab inactive keeps Home available as a real return action on those pages.
    return null;
  }

  if (path === "/" || path === "") return "home";
  if (path.startsWith(SOCIAL_ROUTE_PATHS.reels)) return "reels";
  if (path.startsWith("/rides")) return "ride";
  if (path.startsWith(SOCIAL_ROUTE_PATHS.feed)) return "feed";
  if (path.startsWith(SOCIAL_ROUTE_PATHS.chat)) return "chat";
  if (
    path.startsWith("/account") ||
    path.startsWith(SOCIAL_ROUTE_PATHS.profile) ||
    path.startsWith("/user/") ||
    path.startsWith("/more") ||
    path.startsWith("/personal-dashboard") ||
    path.startsWith("/personal/") ||
    path.startsWith("/shop-dashboard")
  )
    return "account";
  return "home";
};
