// TEMPORARY dev-only harness to reproduce the Build R.O. infinite-render loop in
// isolation (no auth). Delete this file, its route, and the AuthContext export
// when done.
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/contexts/AuthContext";
import AdminStoreEditPage from "@/pages/admin/AdminStoreEditPage";

const STORE_ID = "dev-store-0001";

const FAKE_AUTH: any = {
  user: { id: "dev-user", email: "dev@example.com" },
  session: { user: { id: "dev-user" } },
  isLoading: false,
  isAdmin: false,
  mfaPending: null,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  verifyMfa: async () => ({ error: null }),
  signOut: async () => {},
};

const SYNTHETIC_STORE: any = {
  id: STORE_ID,
  name: "Dev Auto Shop",
  slug: "dev-auto-shop",
  description: "",
  category: "auto-repair",
  owner_id: "dev-user",
  is_active: true,
  market: "US",
  default_language: "en",
  address: "1 Test St",
  phone: "555-0100",
  hours: "",
  rating: 0,
  delivery_min: 0,
  logo_url: "",
  banner_url: "",
  ar_settings: {
    tax_rate: 8.25,
    labor_rate: 145,
    epa_enabled: true, epa_type: "pct", epa_value: 5, epa_on_parts: true, epa_on_labor: false,
    shop_supplies_enabled: true, shop_supplies_type: "pct", shop_supplies_value: 3, shop_supplies_on_parts: true, shop_supplies_on_labor: true,
  },
  created_at: new Date().toISOString(),
  gallery_images: [],
  gallery_positions: {},
};

function Primer({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  useState(() => {
    // Only prime the store row (needed to pass the not-found / access guards).
    // Leave every other query unprimed so they hit the loading/retry window —
    // the loop is suspected to fire during that churn (matches a cold load).
    qc.setQueryData(["admin-store", STORE_ID], SYNTHETIC_STORE);
    return null;
  });
  return <>{children}</>;
}

export default function DevBuildRO() {
  return (
    <AuthContext.Provider value={FAKE_AUTH}>
      <Primer>
        <AdminStoreEditPage />
      </Primer>
    </AuthContext.Provider>
  );
}
