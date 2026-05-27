/**
 * Tiny Zod-compatible schema interface + helpers so functions can validate
 * request input without bundling Zod. If a function already uses Zod, its
 * `safeParse` shape is fully compatible with `parseBody` / `parseQuery`.
 */
import { ValidationError } from "./errors.ts";

export interface SafeParseSuccess<T> {
  success: true;
  data: T;
}

export interface SafeParseFailure {
  success: false;
  error: { flatten: () => { fieldErrors: Record<string, string[]> } };
}

export interface MinimalSchema<T> {
  safeParse: (input: unknown) => SafeParseSuccess<T> | SafeParseFailure;
}

export async function parseBody<T>(req: Request, schema: MinimalSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ValidationError({ _root: ["Invalid JSON body"] });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.flatten().fieldErrors);
  }
  return parsed.data;
}

export function parseQuery<T>(req: Request, schema: MinimalSchema<T>): T {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) params[k] = v;
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.flatten().fieldErrors);
  }
  return parsed.data;
}

type FieldValidator = (value: unknown) => string | null;

/**
 * Tiny built-in validator. Returns objects with `safeParse` compatible with
 * the helpers above. Use real Zod for anything more complex.
 */
export const v = {
  object<S extends Record<string, FieldValidator>>(shape: S): MinimalSchema<Record<keyof S, unknown>> {
    return {
      safeParse(input: unknown) {
        if (!input || typeof input !== "object" || Array.isArray(input)) {
          return failure({ _root: ["Expected an object"] });
        }
        const obj = input as Record<string, unknown>;
        const fieldErrors: Record<string, string[]> = {};
        const out: Record<string, unknown> = {};
        for (const [key, validator] of Object.entries(shape)) {
          const err = validator(obj[key]);
          if (err) fieldErrors[key] = [err];
          else out[key] = obj[key];
        }
        if (Object.keys(fieldErrors).length > 0) return failure(fieldErrors);
        return { success: true, data: out as Record<keyof S, unknown> };
      },
    };
  },
  email(value: unknown): string | null {
    if (typeof value !== "string") return "Required string";
    const trimmed = value.trim();
    if (!trimmed) return "Required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Invalid email";
    return null;
  },
  nonEmptyString(value: unknown): string | null {
    if (typeof value !== "string") return "Required string";
    if (!value.trim()) return "Required";
    return null;
  },
  optionalString(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") return "Must be a string";
    return null;
  },
  minLength(min: number): FieldValidator {
    return (value) => {
      if (typeof value !== "string") return "Required string";
      if (value.length < min) return `Must be at least ${min} characters`;
      return null;
    };
  },
  exactDigits(n: number): FieldValidator {
    return (value) => {
      if (typeof value !== "string") return "Required string";
      if (!new RegExp(`^\\d{${n}}$`).test(value)) return `Must be ${n} digits`;
      return null;
    };
  },
  e164(value: unknown): string | null {
    if (typeof value !== "string") return "Required string";
    if (!/^\+[1-9]\d{6,14}$/.test(value)) return "Must be E.164 phone (e.g. +15551234567)";
    return null;
  },
  uuid(value: unknown): string | null {
    if (typeof value !== "string") return "Required string";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      return "Must be a UUID";
    }
    return null;
  },
};

function failure(fieldErrors: Record<string, string[]>): SafeParseFailure {
  return {
    success: false,
    error: { flatten: () => ({ fieldErrors }) },
  };
}
