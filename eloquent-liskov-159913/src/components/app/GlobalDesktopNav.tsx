/**
 * GlobalDesktopNav — mounts the desktop top NavBar across the entire app
 * on `lg+` screens. On mobile/tablet it renders nothing (the per-page mobile
 * sticky header + ZivoMobileNav own that surface).
 *
 * Excludes routes that already render NavBar themselves (e.g. landing pages
 * for /flights, /hotels, /cars, /eats/restaurant detail) and routes whose
 * fullscreen UX would be broken by an extra top bar (reels, chat threads,
 * admin panels, login flow).
 */
import { Suspense, lazy } from "react";
import { useLocation } from "react-router-dom";

const NavBar = lazy(() => import("@/components/home/NavBar"));

// Routes that already render NavBar themselves (so we'd double-render),
// auth/onboarding flows that should be chromeless, fullscreen surfaces
// where the bar would block UX, or specialized mode shells (admin, driver).
const EXCLUDE_PREFIXES = [
  // Mode shells with their own chrome
  "/admin",
  "/driver/",
  "/partner/",
  // Auth & onboarding — chromeless by design
  "/auth",
  "/login",
  "/onboard",
  "/welcome",
  // Fullscreen / immersive surfaces
  "/reels",
  // Specialized embeds & legal/share landings
  "/p/",
  "/share/",
  "/checkout",
  "/embedded",
  "/dev/",
  // Pages whose components ALREADY render <NavBar /> themselves
  "/feed",          // SocialFeedPage adds NavBar
  "/flights",       // FlightLanding adds NavBar
  "/hotels",        // hotel landing adds NavBar
  "/cars",          // car landing adds NavBar
  "/zivo-plus",     // ZivoPlus adds NavBar
  "/membership",    // MembershipPage adds NavBar
  "/auto-repair",   // AutoRepairPage adds NavBar
  "/vision",        // Vision adds NavBar
  "/referral",      // ReferralProgram adds NavBar
  "/profile",       // Profile adds NavBar
  "/user/",         // PublicProfilePage adds NavBar
  "/stores-list",   // StoresListPage adds NavBar
  "/saved-searches",// SavedSearchesPage adds NavBar
];

const EXCLUDE_EXACT = new Set<string>([
  "/", // Index handles its own redirect/landing
]);

function shouldHide(pathname: string): boolean {
  if (EXCLUDE_EXACT.has(pathname)) return true;
  return EXCLUDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export default function GlobalDesktopNav() {
  const { pathname } = useLocation();
  if (shouldHide(pathname)) return null;
  return (
    <div className="hidden lg:block">
      <Suspense fallback={null}>
        <NavBar />
      </Suspense>
    </div>
  );
}
