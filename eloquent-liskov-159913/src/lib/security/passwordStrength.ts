/**
 * Password strength checker with Have I Been Pwned breach detection
 * Uses k-Anonymity model — only first 5 chars of SHA-1 hash are sent to the API
 * so the full password is never transmitted.
 */

export type PasswordStrength = "weak" | "fair" | "strong" | "very_strong";

export interface PasswordAnalysis {
  strength: PasswordStrength;
  score: number; // 0-100
  feedback: string[];
  isBreached: boolean | null; // null = check not yet complete
  breachCount: number;
}

const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123", "monkey", "master",
  "dragon", "111111", "baseball", "iloveyou", "trustno1", "sunshine",
  "letmein", "football", "shadow", "superman", "passw0rd", "welcome",
  "password1", "1234567890", "zivo", "zivo123",
]);

/**
 * Analyze password strength locally (no network call)
 */
export function analyzePassword(password: string): Omit<PasswordAnalysis, "isBreached" | "breachCount"> {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 15;
  else feedback.push("Use at least 8 characters");

  if (password.length >= 12) score += 15;
  else if (password.length >= 8) score += 5;

  if (/[a-z]/.test(password)) score += 10;
  else feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) score += 15;
  else feedback.push("Add uppercase letters");

  if (/[0-9]/.test(password)) score += 15;
  else feedback.push("Add numbers");

  if (/[^a-zA-Z0-9]/.test(password)) score += 15;
  else feedback.push("Add special characters (!@#$%^&*)");

  // Check for sequential/repeated patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    feedback.push("Avoid repeated characters");
  }
  if (/(?:abc|bcd|cde|def|efg|012|123|234|345|456|567|678|789)/i.test(password)) {
    score -= 10;
    feedback.push("Avoid sequential characters");
  }

  // Check common passwords
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    score = Math.min(score, 10);
    feedback.unshift("This is a commonly used password");
  }

  // Entropy bonus for length
  if (password.length >= 16) score += 15;

  score = Math.max(0, Math.min(100, score));

  let strength: PasswordStrength;
  if (score < 30) strength = "weak";
  else if (score < 55) strength = "fair";
  else if (score < 80) strength = "strong";
  else strength = "very_strong";

  return { strength, score, feedback };
}

/**
 * Check if password has been exposed in known breaches
 * Uses the Have I Been Pwned k-Anonymity API (safe — only 5 char prefix sent)
 */
export async function checkPasswordBreach(password: string): Promise<{ breached: boolean; count: number }> {
  try {
    // SHA-1 hash the password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();

    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" }, // Padding to prevent response-length analysis
    });

    if (!response.ok) return { breached: false, count: 0 };

    const text = await response.text();
    const lines = text.split("\n");

    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(":");
      if (hashSuffix?.trim() === suffix) {
        const count = parseInt(countStr?.trim() || "0", 10);
        return { breached: count > 0, count };
      }
    }

    return { breached: false, count: 0 };
  } catch {
    // Network error — don't block the user, just skip the check
    return { breached: false, count: 0 };
  }
}
