import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { addListener, getStatus, isNativePlatform, toastSuccess, toastWarning } = vi.hoisted(() => ({
  addListener: vi.fn(),
  getStatus: vi.fn(),
  isNativePlatform: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock("@capacitor/network", () => ({
  Network: { addListener, getStatus },
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform },
}));
vi.mock("sonner", () => ({
  toast: { success: toastSuccess, warning: toastWarning },
}));

import { useNetworkStatus } from "./useNetworkStatus";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("useNetworkStatus native listener lifecycle", () => {
  beforeEach(() => {
    addListener.mockReset();
    getStatus.mockReset().mockResolvedValue({ connected: true, connectionType: "wifi" });
    isNativePlatform.mockReset().mockReturnValue(true);
    toastSuccess.mockReset();
    toastWarning.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps one native listener through connectivity transitions", async () => {
    let onStatus!: (status: { connected: boolean; connectionType: string }) => void;
    const remove = vi.fn();
    addListener.mockImplementation(async (_event, callback) => {
      onStatus = callback;
      return { remove };
    });
    const { result, unmount } = renderHook(() => useNetworkStatus());

    await waitFor(() => expect(addListener).toHaveBeenCalledTimes(1));

    act(() => {
      onStatus({ connected: false, connectionType: "wifi" });
    });

    await waitFor(() => expect(result.current.isOnline).toBe(false));
    expect(addListener).toHaveBeenCalledTimes(1);

    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("removes a listener that resolves after the hook has unmounted", async () => {
    const lateHandle = { remove: vi.fn() };
    const lateListener = deferred<typeof lateHandle>();
    addListener.mockReturnValueOnce(lateListener.promise);
    const { unmount } = renderHook(() => useNetworkStatus());

    await waitFor(() => expect(addListener).toHaveBeenCalledTimes(1));
    unmount();

    await act(async () => {
      lateListener.resolve(lateHandle);
      await lateListener.promise;
    });

    expect(lateHandle.remove).toHaveBeenCalledTimes(1);
  });
});
