/**
 * Search abuse protection
 * Detects bot-like search patterns and excessive automated requests.
 */

interface SearchRecord {
  timestamp: number;
  origin: string;
  destination: string;
}

const searchHistory: SearchRecord[] = [];
const WINDOW_MS = 60_000; // 1 minute
const MAX_SEARCHES = 60; // max searches per minute
const IDENTICAL_LIMIT = 15; // max identical searches per minute

export function checkSearchAbuse(
  origin: string,
  destination: string,
  _date: string,
  _sessionId: string
): { allowed: boolean; message: string | null } {
  const now = Date.now();

  // Clean old entries
  while (searchHistory.length > 0 && now - searchHistory[0].timestamp > WINDOW_MS) {
    searchHistory.shift();
  }

  // Check total rate
  if (searchHistory.length >= MAX_SEARCHES) {
    return {
      allowed: false,
      message: "Too many searches. Please wait a moment before trying again.",
    };
  }

  // Check identical search spam
  const identicalCount = searchHistory.filter(
    (s) => s.origin === origin && s.destination === destination
  ).length;

  if (identicalCount >= IDENTICAL_LIMIT) {
    return {
      allowed: false,
      message: "Please wait before repeating the same search.",
    };
  }

  searchHistory.push({ timestamp: now, origin, destination });
  return { allowed: true, message: null };
}
