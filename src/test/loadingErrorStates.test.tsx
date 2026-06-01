import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/shared/RouteErrorBoundary";
import { SmartImage } from "@/components/shared/SmartImage";
import { LazyVideo } from "@/components/shared/LazyVideo";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

function Crash({ message = "visual crash fallback" }: { message?: string }): never {
  throw new Error(message);
}

describe("loading, error, and empty states", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the global crash fallback with support code and recovery actions", async () => {
    render(
      <ErrorBoundary>
        <Crash message="global crash fallback" />
      </ErrorBoundary>,
    );

    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText(/Support code:/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /go home/i })).toBeInTheDocument();
  });

  it("renders the route crash fallback and can recover without taking down the app", async () => {
    let shouldCrash = true;
    function MaybeCrash() {
      if (shouldCrash) throw new Error("route crash fallback");
      return <p>Recovered route</p>;
    }

    render(
      <RouteErrorBoundary section="Settings">
        <MaybeCrash />
      </RouteErrorBoundary>,
    );

    expect(await screen.findByText("Settings Error")).toBeInTheDocument();
    expect(screen.getByText(/Support code:/)).toBeInTheDocument();

    shouldCrash = false;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText("Recovered route")).toBeInTheDocument();
  });

  it("keeps media components on lazy, async, fallback-friendly defaults", async () => {
    render(
      <div>
        <div data-testid="image-frame" className="relative h-20 w-20">
          <SmartImage src="/missing-image.jpg" alt="Preview" />
        </div>
        <LazyVideo data-testid="lazy-video">
          <track kind="captions" />
        </LazyVideo>
      </div>,
    );

    const image = screen.getByAltText("Preview");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("decoding", "async");
    fireEvent.error(image);

    await waitFor(() => {
      expect(screen.getByTestId("image-frame").querySelector("img")).toBeNull();
    });

    expect(screen.getByTestId("lazy-video")).toHaveAttribute("preload", "metadata");
    expect(screen.getByTestId("lazy-video")).toHaveAttribute("playsinline", "");
  });
});
