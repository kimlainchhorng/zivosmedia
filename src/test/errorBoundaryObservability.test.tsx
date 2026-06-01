import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/shared/RouteErrorBoundary";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

function Crash({ message = "boom" }: { message?: string }): never {
  throw new Error(message);
}

describe("error boundary observability", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a support code and emits a client error event for global crashes", async () => {
    const events: Array<Record<string, unknown>> = [];
    window.addEventListener("zivo:client-error", ((event: CustomEvent) => {
      events.push(event.detail);
    }) as EventListener);

    render(
      <ErrorBoundary>
        <Crash />
      </ErrorBoundary>,
    );

    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText(/Support code:/)).toBeInTheDocument();

    await waitFor(() => expect(events).toHaveLength(1));
    expect(events[0]).toMatchObject({
      boundary: "global",
      message: "boom",
    });
    expect(String(events[0].reportId)).toMatch(/^zivo_/);
  });

  it("keeps route crashes scoped and clears the support code on retry", async () => {
    let shouldCrash = true;
    function MaybeCrash() {
      if (shouldCrash) throw new Error("checkout failed");
      return <p>Recovered checkout</p>;
    }

    render(
      <RouteErrorBoundary section="Checkout">
        <MaybeCrash />
      </RouteErrorBoundary>,
    );

    expect(await screen.findByText("Checkout Error")).toBeInTheDocument();
    expect(screen.getByText(/Support code:/)).toBeInTheDocument();

    shouldCrash = false;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText("Recovered checkout")).toBeInTheDocument();
    expect(screen.queryByText(/Support code:/)).not.toBeInTheDocument();
  });
});
