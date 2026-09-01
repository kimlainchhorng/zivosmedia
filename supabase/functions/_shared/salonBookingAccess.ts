import { createClient } from "./deps.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CAPABILITY_RE = /^[0-9a-f]{64}$/;

export type SalonBookingActionScope = "deposit" | "tip";

export const cleanSalonBookingId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
};

export const cleanSalonBookingCapability = (value: unknown): string | null => {
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
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  }) as any;
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user?.id) return null;
  return data.user.id as string;
};

export const authorizeSalonBookingAction = async (input: {
  admin: any;
  req: Request;
  supabaseUrl: string;
  anonKey: string;
  bookingId: string;
  accessToken: string | null;
  scope: SalonBookingActionScope;
}): Promise<boolean> => {
  const userId = await resolveAuthenticatedUserId(
    input.req,
    input.supabaseUrl,
    input.anonKey,
  );
  const { data, error } = await input.admin.rpc("salon_verify_booking_access", {
    p_booking_id: input.bookingId,
    p_access_token: input.accessToken,
    p_scope: input.scope,
    p_user_id: userId,
  });
  return !error && data === true;
};
