export function buildAutoRepairBookingUrl({
  origin,
  storeId,
  slug,
  params,
}: {
  origin: string;
  storeId: string;
  slug?: string | null;
  params?: Record<string, string | null | undefined>;
}) {
  const pathId = (slug && slug.trim()) || storeId;
  const url = new URL(`/book/${encodeURIComponent(pathId)}`, origin);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value && value.trim()) url.searchParams.set(key, value.trim());
  }
  return url.toString();
}
