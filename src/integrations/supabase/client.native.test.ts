import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => true,
  },
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: null })),
    set: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  },
}));

describe("native Supabase auth client", () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    createClientMock.mockImplementation(() => ({
      auth: {
        getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      },
    }));
  });

  it("uses durable native storage without the deprecated global auth lock", async () => {
    await import("./client");

    expect(createClientMock).toHaveBeenCalledTimes(2);
    const authOptions = createClientMock.mock.calls[0]?.[2]?.auth;

    expect(authOptions).toMatchObject({
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: expect.any(Object),
    });
    expect(authOptions).not.toHaveProperty("lock");
  });
});
