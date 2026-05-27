/**
 * Booking Return Handler - Stub
 */
export interface BookingReturnParams {
  bookingRef: string | null;
  status: string | null;
  subid: string | null;
  service: string | null;
}

export interface BookingReturnResult {
  success: boolean;
  bookingRef: string | null;
  service: string;
  status: "converted" | "failed" | "pending" | "unknown";
  message: string;
  searchSession?: {
    type: string;
    origin?: string;
    destination?: string;
  } | null;
  redirectLog?: {
    partnerName?: string;
  } | null;
}

export function parseBookingReturnParams(searchParams: URLSearchParams): BookingReturnParams {
  return {
    bookingRef: searchParams.get("bookingRef") || searchParams.get("confirmation_number") || searchParams.get("ref") || searchParams.get("orderId"),
    status: searchParams.get("status") || "pending",
    subid: searchParams.get("subid"),
    service: searchParams.get("service") || "flights",
  };
}

export async function processBookingReturn(params: BookingReturnParams): Promise<BookingReturnResult> {
  const status = params.status === "success" ? "converted" : params.status === "failed" ? "failed" : "pending";
  return {
    success: status === "converted",
    bookingRef: params.bookingRef,
    service: params.service || "flights",
    status,
    message: status === "converted" ? "Booking confirmed" : "Booking status pending",
    searchSession: null,
    redirectLog: null,
  };
}
