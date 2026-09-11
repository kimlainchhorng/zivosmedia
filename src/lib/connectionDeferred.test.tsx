import { Component, useState, type ReactNode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectionDeferred } from "./connectionDeferred";

const downloadError = () =>
  new TypeError(
    "Failed to fetch dynamically imported module: /assets/tools.js",
  );
function connection(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: online,
  });
  act(() => window.dispatchEvent(new Event(online ? "online" : "offline")));
}

class TestBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p>Unexpected failure</p> : this.props.children;
  }
}

beforeEach(() => connection(true));
afterEach(() => {
  cleanup();
  connection(true);
  vi.restoreAllMocks();
});

describe("connection-deferred incidental UI", () => {
  it("does not start a module download while initially offline", async () => {
    connection(false);
    const load = vi
      .fn()
      .mockResolvedValue({ default: () => <p>Tools loaded</p> });
    const Tools = connectionDeferred(load);
    render(
      <>
        <h1>Recovery page</h1>
        <Tools />
      </>,
    );
    await act(async () => {});
    expect(load).not.toHaveBeenCalled();
    connection(true);
    expect(await screen.findByText("Tools loaded")).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("contains an interrupted import and retries it after reconnect", async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(downloadError())
      .mockResolvedValueOnce({ default: () => <p>Tools loaded</p> });
    const Tools = connectionDeferred(load);
    render(
      <TestBoundary>
        <h1>Recovery page</h1>
        <Tools />
      </TestBoundary>,
    );
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(
      screen.getByRole("heading", { name: "Recovery page" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Unexpected failure")).not.toBeInTheDocument();
    connection(false);
    connection(true);
    expect(await screen.findByText("Tools loaded")).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("preserves a loaded sheet's draft across connection changes", async () => {
    function Draft({ label }: { label: string }) {
      const [draft, setDraft] = useState("");
      return (
        <input
          aria-label={label}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      );
    }
    const load = vi.fn().mockResolvedValue({ default: Draft });
    const Tools = connectionDeferred<{ label: string }>(load);
    render(<Tools label="Draft" />);
    fireEvent.change(await screen.findByRole("textbox"), {
      target: { value: "Keep my draft" },
    });
    connection(false);
    connection(true);
    expect(screen.getByRole("textbox")).toHaveValue("Keep my draft");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("ignores a completion after unmount and permits a fresh mount", async () => {
    let complete!: (value: { default: () => ReactNode }) => void;
    const load = vi.fn(
      () =>
        new Promise<{ default: () => ReactNode }>((resolve) => {
          complete = resolve;
        }),
    );
    const Tools = connectionDeferred(load);
    const first = render(<Tools />);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    first.unmount();
    await act(async () => {
      complete({ default: () => <p>Old tools</p> });
    });
    render(<Tools />);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Old tools")).not.toBeInTheDocument();
    await act(async () => {
      complete({ default: () => <p>Fresh tools</p> });
    });
    expect(screen.getByText("Fresh tools")).toBeInTheDocument();
  });

  it("does not silence unexpected module or component failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Tools = connectionDeferred(async () => {
      throw new ReferenceError("Broken module code");
    });
    render(
      <TestBoundary>
        <Tools />
      </TestBoundary>,
    );
    expect(await screen.findByText("Unexpected failure")).toBeInTheDocument();
  });

  it("does not mount a late download while the device has gone offline", async () => {
    let complete!: (value: { default: () => ReactNode }) => void;
    const load = vi.fn(
      () =>
        new Promise<{ default: () => ReactNode }>((resolve) => {
          complete = resolve;
        }),
    );
    const Tools = connectionDeferred(load);
    render(<Tools />);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    connection(false);
    await act(async () => {
      complete({ default: () => <p>Stale download</p> });
    });
    expect(screen.queryByText("Stale download")).not.toBeInTheDocument();
    connection(true);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    await act(async () => {
      complete({ default: () => <p>Recovered tools</p> });
    });
    expect(screen.getByText("Recovered tools")).toBeInTheDocument();
  });
});
