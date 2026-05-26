import { Helmet } from "react-helmet-async";

/**
 * Ensures iOS safe-area env() values work (requires viewport-fit=cover)
 * without touching index.html.
 */
export function GlobalViewportMeta() {
  return (
    <Helmet>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, viewport-fit=cover"
      />
    </Helmet>
  );
}
