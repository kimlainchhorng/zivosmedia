// Origin of the Zivo-Admin control plane (the staff dashboard). Override locally
// with VITE_ADMIN_APP_URL (e.g. http://localhost:5188); defaults to the production
// admin host. The dashboard navigates via in-page hash anchors (e.g. "#travel-ops"),
// matching the `adminHref` values in Zivo-Admin's config/connected-workflows.json.
const FALLBACK_ADMIN_ORIGIN = "https://admin.zivosmedia.com";

export const ZIVO_ADMIN_ORIGIN = (
  ((import.meta.env?.VITE_ADMIN_APP_URL as string | undefined) ?? "").trim() || FALLBACK_ADMIN_ORIGIN
).replace(/\/+$/, "");

// Build a deep link into a Zivo-Admin queue. `adminHref` is a hash anchor such as
// "#travel-ops"; an optional handoff id is carried as a query param so staff can
// jump straight to the originating cross-app handoff.
export const buildAdminQueueHref = (adminHref: string, handoffId?: string | null) => {
  const anchor = adminHref.startsWith("#") ? adminHref : `#${adminHref}`;
  const query = handoffId ? `?handoff=${encodeURIComponent(handoffId)}` : "";
  return `${ZIVO_ADMIN_ORIGIN}/${query}${anchor}`;
};
