import { createClient } from "./deps.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CAPABILITY_RE = /^[0-9a-f]{64}$/;

export const createCarDealershipServiceClient = (
  supabaseUrl: string,
  serviceKey: string,
) =>
  createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

type CarDealershipServiceClient = ReturnType<
  typeof createCarDealershipServiceClient
>;

export type CarDealershipSaleReviewAuthorization = {
  accessToken: string | null;
  userId: string | null;
};

export const cleanCarDealershipUuid = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
};

export const cleanCarDealershipCapability = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const token = value.trim().toLowerCase();
  return CAPABILITY_RE.test(token) ? token : null;
};

export const resolveCarDealershipUserId = async (
  req: Request,
  supabaseUrl: string,
  anonKey: string,
): Promise<string | null> => {
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data, error } = await userClient.auth.getUser();
    if (error) return null;
    return cleanCarDealershipUuid(data?.user?.id);
  } catch {
    return null;
  }
};

export const authorizeCarDealershipSaleReviewAccess = async (input: {
  admin: CarDealershipServiceClient;
  req: Request;
  supabaseUrl: string;
  anonKey: string;
  saleId: unknown;
  accessToken?: unknown;
}): Promise<CarDealershipSaleReviewAuthorization | null> => {
  const saleId = cleanCarDealershipUuid(input.saleId);
  if (!saleId) return null;

  const rawAccessToken =
    typeof input.accessToken === "string"
      ? input.accessToken.trim()
      : input.accessToken;
  const accessToken = cleanCarDealershipCapability(rawAccessToken);
  if (
    rawAccessToken !== null &&
    rawAccessToken !== undefined &&
    rawAccessToken !== "" &&
    !accessToken
  ) {
    return null;
  }

  const userId = await resolveCarDealershipUserId(
    input.req,
    input.supabaseUrl,
    input.anonKey,
  );
  const { data, error } = await input.admin.rpc(
    "car_dealership_verify_sale_review_access",
    {
      p_sale_id: saleId,
      p_access_token: accessToken,
      p_user_id: userId,
    },
  );

  return !error && data === true ? { accessToken, userId } : null;
};
