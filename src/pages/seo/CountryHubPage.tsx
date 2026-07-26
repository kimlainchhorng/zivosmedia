/**
 * COUNTRY HUB PAGE
 * Deprecated. There is no known-countries list left in the codebase (the
 * page has been a stub since it was committed), so any single-segment slug
 * that falls through to this route is simply not a page — render the app's
 * NotFound instead of silently redirecting to home.
 */
import NotFound from "../NotFound";

export default function CountryHubPage() {
  return <NotFound />;
}
