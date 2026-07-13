/**
 * Unit tests for the slug-resolution + persistence helpers used by
 * BusinessPageWizard. These run without React.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  findAvailableSlug,
  persistWizardPartial,
  slugify,
  SLUG_TAKEN_MESSAGE,
  type WizardSnapshot,
} from "./wizardPersistence";

// ---- Supabase mock ---------------------------------------------------------

type Row = Record<string, any>;
const state: {
  storeRows: Row[];
  insertResult: { data?: Row; error?: any };
  updateResult: { error?: any };
  profileUpdateCalls: Row[];
  insertCalls: Row[];
  updateCalls: { id: string; payload: Row }[];
} = {
  storeRows: [],
  insertResult: { data: { id: "new-id" } },
  updateResult: {},
  profileUpdateCalls: [],
  insertCalls: [],
  updateCalls: [],
};

vi.mock("@/integrations/supabase/client", () => {
  const select = (eq: { col: string; val: any } | null) => ({
    maybeSingle: async () => {
      if (!eq) return { data: null, error: null };
      const row = state.storeRows.find((r) => r[eq.col] === eq.val);
      return { data: row || null, error: null };
    },
  });

  return {
    supabase: {
      from(table: string) {
        if (table === "store_profiles") {
          return {
            select() {
              return {
                eq(col: string, val: any) {
                  return select({ col, val });
                },
              };
            },
            insert(payload: Row) {
              state.insertCalls.push(payload);
              return {
                select() {
                  return {
                    async single() {
                      if (state.insertResult.error) {
                        return { data: null, error: state.insertResult.error };
                      }
                      const row = { ...payload, ...state.insertResult.data };
                      state.storeRows.push(row);
                      return { data: row, error: null };
                    },
                  };
                },
              };
            },
            update(payload: Row) {
              return {
                async eq(col: string, val: any) {
                  state.updateCalls.push({ id: val, payload });
                  return { error: state.updateResult.error || null };
                },
              };
            },
          };
        }
        if (table === "profiles") {
          return {
            update(payload: Row) {
              state.profileUpdateCalls.push(payload);
              return {
                async eq() {
                  return { error: null };
                },
              };
            },
          };
        }
        return {} as any;
      },
    },
  };
});

const baseSnapshot: WizardSnapshot = {
  bizName: "Sunrise Coffee",
  bizDescription: "",
  bizPhone: "(555) 123-4567",
  bizEmail: "hello@sunrise.test",
  category: "cafe",
  firstName: "Ada",
  lastName: "Lovelace",
  contactPhone: "(555) 999-0000",
  contactEmail: "ada@example.com",
  logoUrl: null,
  bannerUrl: null,
  address: "",
  paymentTypes: [],
  facebookUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  telegramUrl: "",
};

beforeEach(() => {
  state.storeRows = [];
  state.insertResult = { data: { id: "new-id" } };
  state.updateResult = {};
  state.profileUpdateCalls = [];
  state.insertCalls = [];
  state.updateCalls = [];
});

describe("slugify", () => {
  it("lowercases and dashes the input", () => {
    expect(slugify("Sunrise Coffee Co.")).toBe("sunrise-coffee-co");
  });
  it("falls back to a biz-* slug when input is empty", () => {
    expect(slugify("!!!")).toMatch(/^biz-\d+$/);
  });
});

describe("findAvailableSlug", () => {
  it("returns the base slug when no row exists", async () => {
    const slug = await findAvailableSlug("sunrise-coffee", "owner-1");
    expect(slug).toBe("sunrise-coffee");
  });

  it("returns the same slug when the row belongs to the same owner", async () => {
    state.storeRows = [{ slug: "sunrise-coffee", owner_id: "owner-1" }];
    const slug = await findAvailableSlug("sunrise-coffee", "owner-1");
    expect(slug).toBe("sunrise-coffee");
  });

  it("appends a numeric suffix when the base is taken by another owner", async () => {
    state.storeRows = [{ slug: "sunrise-coffee", owner_id: "owner-other" }];
    const slug = await findAvailableSlug("sunrise-coffee", "owner-1");
    expect(slug).toBe("sunrise-coffee-2");
  });
});

describe("persistWizardPartial", () => {
  it("inserts a new store_profiles row when none exists", async () => {
    const res = await persistWizardPartial({
      userId: "owner-1",
      storeId: null,
      snapshot: baseSnapshot,
    });
    expect(res.id).toBe("new-id");
    expect(res.error).toBeUndefined();
    expect(state.insertCalls).toHaveLength(1);
    const payload = state.insertCalls[0];
    expect(payload.owner_id).toBe("owner-1");
    expect(payload.name).toBe("Sunrise Coffee");
    expect(payload.setup_complete).toBe(false);
    // CRITICAL: must NOT include an `email` column.
    expect(payload).not.toHaveProperty("email");
  });

  it("updates the existing row when storeId is supplied", async () => {
    const res = await persistWizardPartial({
      userId: "owner-1",
      storeId: "existing-id",
      snapshot: baseSnapshot,
    });
    expect(res.id).toBe("existing-id");
    expect(state.updateCalls).toHaveLength(1);
    expect(state.updateCalls[0].id).toBe("existing-id");
    expect(state.insertCalls).toHaveLength(0);
  });

  it("returns the friendly error when slug is taken (insert path, 23505)", async () => {
    state.insertResult = { error: { code: "23505", message: "duplicate key" } };
    const res = await persistWizardPartial({
      userId: "owner-1",
      storeId: null,
      snapshot: baseSnapshot,
    });
    expect(res.id).toBeNull();
    expect(res.error).toBe(SLUG_TAKEN_MESSAGE);
  });

  it("also writes profile fields when persistProfile is true", async () => {
    await persistWizardPartial({
      userId: "owner-1",
      storeId: null,
      snapshot: baseSnapshot,
      persistProfile: true,
    });
    expect(state.profileUpdateCalls).toHaveLength(1);
    expect(state.profileUpdateCalls[0].full_name).toBe("Ada Lovelace");
    expect(state.profileUpdateCalls[0].phone).toBe("5559990000");
  });

  it("does not write profile when persistProfile is false/undefined", async () => {
    await persistWizardPartial({
      userId: "owner-1",
      storeId: null,
      snapshot: baseSnapshot,
    });
    expect(state.profileUpdateCalls).toHaveLength(0);
  });
});
