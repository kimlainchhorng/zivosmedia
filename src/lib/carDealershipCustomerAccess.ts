import { supabase as typedSupabase } from "@/integrations/supabase/client";

const supabase: any = typedSupabase;
const CAPABILITY_RE = /^[0-9a-f]{64}$/;

export type CarDealershipAccessSubject = "test-drive" | "sale";
export type CarDealershipAccessScope = "manage" | "review";
export type CarDealershipAccessDestination = "test-drive" | "review";

export interface IssuedCarDealershipAccess {
  token: string | null;
  expiresAt: string | null;
  accountOwned: boolean;
}

const storageKey = (
  subject: CarDealershipAccessSubject,
  subjectId: string,
  scope: CarDealershipAccessScope,
) => `zivo:car-dealership-access:${subject}:${scope}:${subjectId}`;

export const normalizeCarDealershipCustomerAccessToken = (
  value: unknown,
): string | null => {
  if (typeof value !== "string") return null;
  const token = value.trim().toLowerCase();
  return CAPABILITY_RE.test(token) ? token : null;
};

/**
 * Read a customer capability from #cap=..., remove the fragment from browser
 * history immediately, and retain the normalized secret only for this tab.
 */
export const readCarDealershipCustomerAccessToken = (
  subject: CarDealershipAccessSubject,
  subjectId: string,
  scope: CarDealershipAccessScope,
): string | null => {
  if (typeof window === "undefined" || !subjectId) return null;

  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = normalizeCarDealershipCustomerAccessToken(fragment.get("cap"));
  if (window.location.hash) {
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }

  if (token) {
    window.sessionStorage.setItem(storageKey(subject, subjectId, scope), token);
    return token;
  }

  return normalizeCarDealershipCustomerAccessToken(
    window.sessionStorage.getItem(storageKey(subject, subjectId, scope)),
  );
};

export const persistCarDealershipCustomerAccessToken = (
  subject: CarDealershipAccessSubject,
  subjectId: string,
  scope: CarDealershipAccessScope,
  token: string | null,
) => {
  if (typeof window === "undefined" || !subjectId) return;
  const normalized = normalizeCarDealershipCustomerAccessToken(token);
  if (normalized) {
    window.sessionStorage.setItem(
      storageKey(subject, subjectId, scope),
      normalized,
    );
  }
};

export const buildCarDealershipCustomerAccessPath = (
  storeSlug: string,
  destination: CarDealershipAccessDestination,
  subjectId: string,
  token: string | null,
) => {
  const path = `/car-dealership/${encodeURIComponent(storeSlug)}/${destination}/${encodeURIComponent(subjectId)}`;
  const normalized = normalizeCarDealershipCustomerAccessToken(token);
  return normalized ? `${path}#cap=${encodeURIComponent(normalized)}` : path;
};

export const buildCarDealershipTestDriveAccessPath = (
  storeSlug: string,
  testDriveId: string,
  token: string | null,
<<<<<<< Updated upstream
) =>
  buildCarDealershipCustomerAccessPath(
    storeSlug,
    "test-drive",
    testDriveId,
    token,
  );
=======
) => buildCarDealershipCustomerAccessPath(
  storeSlug,
  "test-drive",
  testDriveId,
  token,
);
>>>>>>> Stashed changes

export const buildCarDealershipSaleReviewAccessPath = (
  storeSlug: string,
  saleId: string,
  token: string | null,
<<<<<<< Updated upstream
) => buildCarDealershipCustomerAccessPath(storeSlug, "review", saleId, token);
=======
) => buildCarDealershipCustomerAccessPath(
  storeSlug,
  "review",
  saleId,
  token,
);
>>>>>>> Stashed changes

const firstRow = (data: unknown) => {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === "object"
<<<<<<< Updated upstream
    ? (row as {
        access_token?: unknown;
        expires_at?: unknown;
        account_owned?: unknown;
      })
=======
    ? row as {
        access_token?: unknown;
        expires_at?: unknown;
        account_owned?: unknown;
      }
>>>>>>> Stashed changes
    : null;
};

const issueAccess = async (
  rpcName: string,
  args: Record<string, string>,
): Promise<IssuedCarDealershipAccess> => {
  const { data, error } = await supabase.rpc(rpcName, args);
  if (error) throw new Error("Could not create a secure customer link.");
  const row = firstRow(data);
  return {
    token: normalizeCarDealershipCustomerAccessToken(row?.access_token),
    expiresAt: typeof row?.expires_at === "string" ? row.expires_at : null,
    accountOwned: row?.account_owned === true,
  };
};

<<<<<<< Updated upstream
export const issueCarDealershipTestDriveAccess = (testDriveId: string) =>
  issueAccess("car_dealership_issue_test_drive_access", {
    p_test_drive_id: testDriveId,
  });

export const issueCarDealershipSaleReviewAccess = (saleId: string) =>
  issueAccess("car_dealership_issue_sale_review_access", {
    p_sale_id: saleId,
  });
=======
export const issueCarDealershipTestDriveAccess = (
  testDriveId: string,
) => issueAccess("car_dealership_issue_test_drive_access", {
  p_test_drive_id: testDriveId,
});

export const issueCarDealershipSaleReviewAccess = (
  saleId: string,
) => issueAccess("car_dealership_issue_sale_review_access", {
  p_sale_id: saleId,
});
>>>>>>> Stashed changes
