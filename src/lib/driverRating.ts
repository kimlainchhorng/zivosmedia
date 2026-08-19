/**
 * A driver's rating, only when someone actually gave it.
 *
 * `drivers.rating` carries a column default of 5 alongside `rating_count = 0`,
 * so any check on the value alone — `!= null`, a truthiness test, or
 * `Number.isFinite` — is satisfied by a driver nobody has ever rated. This app
 * had six such sites, two of which invented a score outright:
 * `driver?.rating ?? 5.0` and `driverProfile.rating ?? 4.8`.
 *
 * Measured on the shared driver project on 2026-08-19: of 116 drivers, **none**
 * has `rating_count > 0`, and no ride has ever completed, so no rating can
 * exist yet. Every star these screens could draw was invented — including on
 * `SharedTripPage`, which is public and shows one to someone who is not a user.
 *
 * The same distinction this app already draws for bots
 * (`BotPublicProfilePage`: `(bot.rating_count ?? 0) > 0`), applied to drivers.
 *
 * Returns null when there is nothing honest to show; callers render no star.
 *
 * NOTE FOR CALLERS: whatever query feeds you must actually select
 * `rating_count`. A guard reading a column nobody selected is always false,
 * which hides every REAL rating instead of every invented one.
 */
export function displayableDriverRating(
  rating: unknown,
  ratingCount: unknown,
): string | null {
  const count =
    typeof ratingCount === "number" && Number.isFinite(ratingCount) ? ratingCount : 0;
  if (count <= 0) return null;

  const value = typeof rating === "number" ? rating : Number(rating);
  if (!Number.isFinite(value) || value <= 0 || value > 5) return null;
  return value.toFixed(1);
}
