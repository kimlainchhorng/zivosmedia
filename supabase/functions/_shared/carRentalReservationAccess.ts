import { createClient } from "./deps.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CAPABILITY_RE = /^[0-9a-f]{64}$/;

export type CarRentalReservationAccessScope = "manage" | "review" | "status";

export type CarRentalReservationAccessAuthorization = {
  accessToken: string | null;
  userId: string | null;
};

export const cleanCarRentalReservationId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
};

export const cleanCarRentalReservationCapability = (
  value: unknown,
): string | null => {
  if (typeof value !== "string") return null;
  const token = value.trim().toLowerCase();
  return CAPABILITY_RE.test(token) ? token : null;
};

const resolveAuthenticatedUserId = async (
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
    }) as any;
    const { data, error } = await userClient.auth.getUser();
    if (error) return null;
    return cleanCarRentalReservationId(data?.user?.id);
  } catch {
    return null;
  }
};

export const authorizeCarRentalReservationAccess = async (input: {
  admin: any;
  req: Request;
  supabaseUrl: string;
  anonKey: string;
  reservationId: unknown;
  accessToken?: unknown;
  scope: CarRentalReservationAccessScope;
}): Promise<CarRentalReservationAccessAuthorization | null> => {
  const reservationId = cleanCarRentalReservationId(input.reservationId);
  if (!reservationId) return null;

  const rawAccessToken = typeof input.accessToken === "string"
    ? input.accessToken.trim()
    : input.accessToken;
  const accessToken = cleanCarRentalReservationCapability(rawAccessToken);
  if (
    rawAccessToken !== null && rawAccessToken !== undefined &&
    rawAccessToken !== "" && !accessToken
  ) {
    return null;
  }

  const userId = await resolveAuthenticatedUserId(
    input.req,
    input.supabaseUrl,
    input.anonKey,
  );
  const { data, error } = await input.admin.rpc(
    "car_rental_verify_reservation_access",
    {
      p_reservation_id: reservationId,
      p_access_token: accessToken,
      p_scope: input.scope,
      p_user_id: userId,
    },
  );
  return !error && data === true ? { accessToken, userId } : null;
};
