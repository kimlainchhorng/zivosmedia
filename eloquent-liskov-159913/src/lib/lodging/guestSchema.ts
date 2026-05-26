/**
 * guestSchema - Zod validation for the lodging booking guest step.
 */
import { z } from "zod";
import { normalizePhoneE164, normalizePhoneDigits } from "@/lib/phone";

export const guestSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(100),
  phone: z
    .string()
    .trim()
    .refine((v) => normalizePhoneDigits(v).length >= 7, "Enter a valid phone number")
    .transform((v) => normalizePhoneE164(v)),
  email: z.string().trim().email("Enter a valid email").max(255),
});

export type GuestForm = z.infer<typeof guestSchema>;

export function validateGuest(input: { name: string; phone: string; email: string }) {
  const result = guestSchema.safeParse(input);
  if (result.success) return { valid: true as const, errors: {} as Record<string, string> };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const k = String(issue.path[0] || "");
    if (!errors[k]) errors[k] = issue.message;
  }
  return { valid: false as const, errors };
}
