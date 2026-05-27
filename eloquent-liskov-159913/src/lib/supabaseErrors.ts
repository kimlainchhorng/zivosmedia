// Error types for categorization
export type SupabaseErrorType =
  | "network"
  | "auth"
  | "database"
  | "rate_limit"
  | "unknown";

export interface SupabaseErrorInfo {
  type: SupabaseErrorType;
  message: string;
  userMessage: string;
  isRetryable: boolean;
  originalError?: unknown;
}

// Categorize errors from Supabase responses
export function categorizeError(error: unknown): SupabaseErrorInfo {
  // Check for network errors (fetch failures, timeouts)
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      type: "network",
      message: error.message,
      userMessage: "Unable to connect. Check your internet connection.",
      isRetryable: true,
      originalError: error,
    };
  }

  // Check for AbortError (timeout)
  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      type: "network",
      message: "Request timed out",
      userMessage: "Request timed out. Tap to retry.",
      isRetryable: true,
      originalError: error,
    };
  }

  // Check for Supabase-specific errors
  if (typeof error === "object" && error !== null) {
    const err = error as { code?: string; message?: string; status?: number; details?: string };

    // Auth errors
    if (err.status === 401 || err.code === "PGRST301") {
      return {
        type: "auth",
        message: err.message || "Unauthorized",
        userMessage: "Session expired. Please sign in again.",
        isRetryable: false,
        originalError: error,
      };
    }

    // Forbidden (RLS policy violation without proper auth)
    if (err.status === 403) {
      return {
        type: "auth",
        message: err.message || "Forbidden",
        userMessage: "Access denied. Please sign in.",
        isRetryable: false,
        originalError: error,
      };
    }

    // Rate limiting
    if (err.status === 429) {
      return {
        type: "rate_limit",
        message: "Rate limited",
        userMessage: "Too many requests. Please wait a moment.",
        isRetryable: true,
        originalError: error,
      };
    }

    // Service unavailable
    if (err.status === 503 || err.status === 502 || err.status === 504) {
      return {
        type: "network",
        message: err.message || "Service unavailable",
        userMessage: "Service temporarily unavailable. Please try again shortly.",
        isRetryable: true,
        originalError: error,
      };
    }

    // RLS or database constraint errors
    if (err.code?.startsWith("PGRST") || err.code?.startsWith("23")) {
      return {
        type: "database",
        message: err.message || "Database error",
        userMessage: "Unable to save your request. Please try again.",
        isRetryable: true,
        originalError: error,
      };
    }

    // Generic server error
    if (err.status && err.status >= 500) {
      return {
        type: "database",
        message: err.message || "Server error",
        userMessage: "Server error. Please try again.",
        isRetryable: true,
        originalError: error,
      };
    }

    // If there's an error message from Supabase
    if (err.message) {
      return {
        type: "unknown",
        message: err.message,
        userMessage: "Something went wrong. Please try again.",
        isRetryable: true,
        originalError: error,
      };
    }
  }

  return {
    type: "unknown",
    message: String(error),
    userMessage: "Something went wrong. Please try again.",
    isRetryable: true,
    originalError: error,
  };
}

// Options for retry logic
export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: SupabaseErrorInfo) => void;
}

// Result type for retry operations
export interface RetryResult<T> {
  data: T | null;
  error: SupabaseErrorInfo | null;
  attempts: number;
}

// Retry with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const { maxAttempts = 3, baseDelayMs = 1000, onRetry } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      return { data: result, error: null, attempts: attempt };
    } catch (err) {
      const errorInfo = categorizeError(err);

      console.debug(
        `[withRetry] Attempt ${attempt}/${maxAttempts} failed:`,
        errorInfo.type,
        errorInfo.message
      );

      // Don't retry non-retryable errors
      if (!errorInfo.isRetryable || attempt === maxAttempts) {
        return { data: null, error: errorInfo, attempts: attempt };
      }

      // Notify caller of retry
      onRetry?.(attempt, errorInfo);

      // Wait with exponential backoff
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.debug(`[withRetry] Waiting ${delay}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    data: null,
    error: {
      type: "unknown",
      message: "Max retries exceeded",
      userMessage: "Request failed after multiple attempts.",
      isRetryable: false,
    },
    attempts: maxAttempts,
  };
}

// Check if we're online (browser API)
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

// Format error for logging
export function formatErrorForLog(error: SupabaseErrorInfo): string {
  return `[${error.type}] ${error.message}`;
}
