/** Flight error handling stubs */
export function transformFlightError(message: string): string {
  if (message.includes("timeout") || message.includes("TIMEOUT")) {
    return "The search took too long. Please try again.";
  }
  if (message.includes("rate") || message.includes("limit")) {
    return "Too many requests. Please wait a moment and try again.";
  }
  return message || "An error occurred while searching for flights.";
}

export function isRetryableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("timeout") || msg.includes("network") || msg.includes("503");
}

export function getErrorSeverity(error: unknown): "info" | "warning" | "error" {
  if (isRetryableError(error)) return "warning";
  return "error";
}
