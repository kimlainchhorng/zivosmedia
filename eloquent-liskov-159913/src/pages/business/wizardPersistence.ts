/**
 * Pure-ish persistence helpers for BusinessPageWizard.
 * Extracted so they can be unit-tested without rendering React.
 */
import { supabase } from "@/integrations/supabase/client";
import type { StoreCategory } from "@/config/groceryStores";

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `biz-${Date.now()}`;

export const SLUG_TAKEN_MESSAGE =
  "That business name is already taken — try a small variation.";

/** Find a slug that isn't taken by another owner. Returns null if all attempts collide. */
export async function findAvailableSlug(
  base: string,
  ownerId: string
): Promise<string | null> {
  const candidates = [base, ...Array.from({ length: 5 }, (_, i) => `${base}-${i + 2}`)];
  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from("store_profiles")
      .select("id, owner_id")
      .eq("slug", candidate)
      .maybeSingle();
    // If query fails entirely, optimistically return — DB unique index is the final guard.
    if (error) return candidate;
    if (!data || (data as any).owner_id === ownerId) return candidate;
  }
  return null;
}

export type WizardSnapshot = {
  bizName: string;
  bizDescription: string;
  bizPhone: string;
  bizEmail: string;
  category: StoreCategory | "";
  firstName: string;
  lastName: string;
  contactPhone: string;
  contactEmail: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  address: string;
  paymentTypes: string[];
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  telegramUrl: string;
};

export type PersistArgs = {
  userId: string;
  storeId: string | null;
  snapshot: WizardSnapshot;
  /** Persist contact-person fields onto profiles too (called from step ≥3). */
  persistProfile?: boolean;
};

export type PersistResult = {
  id: string | null;
  error?: string;
};

export async function persistWizardPartial({
  userId,
  storeId,
  snapshot,
  persistProfile,
}: PersistArgs): Promise<PersistResult> {
  try {
    const base = slugify(snapshot.bizName);
    const slug = await findAvailableSlug(base, userId);
    if (!slug) return { id: null, error: SLUG_TAKEN_MESSAGE };

    // store_profiles has no `email` column — keep it out of the payload.
    const payload: Record<string, unknown> = {
      owner_id: userId,
      name: snapshot.bizName.trim(),
      slug,
      description: snapshot.bizDescription.trim() || null,
      category: snapshot.category || null,
      phone: snapshot.bizPhone.replace(/\D/g, "") || null,
      logo_url: snapshot.logoUrl,
      banner_url: snapshot.bannerUrl,
      address: snapshot.address.trim() || null,
      facebook_url: snapshot.facebookUrl.trim() || null,
      instagram_url: snapshot.instagramUrl.trim() || null,
      tiktok_url: snapshot.tiktokUrl.trim() || null,
      telegram_url: snapshot.telegramUrl.trim() || null,
      setup_complete: false,
    };
    if (snapshot.paymentTypes.length > 0) {
      payload.payment_types = snapshot.paymentTypes;
    }

    let nextId: string | null = storeId;

    if (storeId) {
      const { error } = await supabase
        .from("store_profiles")
        .update(payload as never)
        .eq("id", storeId);
      if (error) {
        if ((error as any).code === "23505") return { id: null, error: SLUG_TAKEN_MESSAGE };
        return { id: null, error: error.message };
      }
    } else {
      const { data, error } = await supabase
        .from("store_profiles")
        .insert(payload as never)
        .select("id")
        .single();
      if (error) {
        if ((error as any).code === "23505") return { id: null, error: SLUG_TAKEN_MESSAGE };
        return { id: null, error: error.message };
      }
      nextId = (data as any).id;
    }

    if (persistProfile) {
      const fullName = `${snapshot.firstName.trim()} ${snapshot.lastName.trim()}`.trim();
      // Best-effort — we don't fail the whole save if profile update fails.
      await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          phone: snapshot.contactPhone.replace(/\D/g, "") || null,
        })
        .eq("user_id", userId);
    }

    return { id: nextId };
  } catch (e: any) {
    return { id: null, error: e?.message || "Could not save progress" };
  }
}
