import { afterEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  authSupabase: {
    auth: { getSession },
  },
}));

import { completeZivoAiChat, streamZivoAiChat } from "@/lib/zivoAiChat";

afterEach(() => {
  getSession.mockReset();
  vi.unstubAllGlobals();
});

describe("ZIVO AI authenticated caller", () => {
  it("fails closed before the network when no current session exists", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    const request = vi.fn();
    vi.stubGlobal("fetch", request);

    await expect(
      completeZivoAiChat({
        messages: [{ role: "user", content: "Hello" }],
      }),
    ).rejects.toThrow("Sign in to use ZIVO AI");

    expect(request).not.toHaveBeenCalled();
  });

  it("attaches the current main auth access token to non-streaming calls", async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: "current-main-access-token" } },
      error: null,
    });
    const request = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        expect(headers.get("authorization")).toBe(
          "Bearer current-main-access-token",
        );
        expect(headers.get("content-type")).toBe("application/json");
        return Response.json({
          choices: [{ message: { content: "Authenticated answer" } }],
        });
      },
    );
    vi.stubGlobal("fetch", request);

    await expect(
      completeZivoAiChat({
        messages: [{ role: "user", content: "Hello" }],
      }),
    ).resolves.toBe("Authenticated answer");

    expect(request).toHaveBeenCalledTimes(1);
  });

  it("attaches the same current access token to streaming calls", async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: "current-main-stream-token" } },
      error: null,
    });
    const encoder = new TextEncoder();
    const request = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer current-main-stream-token",
        );
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode(
                  'data: {"choices":[{"delta":{"content":"Safe"}}]}\n\n',
                ),
              );
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            },
          }),
          { headers: { "content-type": "text/event-stream" } },
        );
      },
    );
    vi.stubGlobal("fetch", request);
    const deltas: string[] = [];

    await streamZivoAiChat({
      messages: [{ role: "user", content: "Hello" }],
      onDelta: (delta) => deltas.push(delta),
    });

    expect(deltas).toEqual(["Safe"]);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
