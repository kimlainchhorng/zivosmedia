/**
 * The bug this guards: a page opened directly (shared link, push
 * notification, deep link) is the first history entry, so `navigate(-1)` has
 * nothing to pop and the back button silently does nothing. Reported on
 * /grocery — "stuck, won't get out when click button back".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGoBack } from "./useGoBack";

const navigate = vi.fn();
let mockKey = "default";

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
  useLocation: () => ({ key: mockKey, pathname: "/grocery" }),
}));

beforeEach(() => {
  navigate.mockReset();
  mockKey = "default";
});

describe("useGoBack", () => {
  it("sends the user to the fallback when the page is the first entry", () => {
    mockKey = "default";
    const { result } = renderHook(() => useGoBack("/"));
    result.current();
    // navigate(-1) here would do nothing at all — that is the stuck state.
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
    expect(navigate).not.toHaveBeenCalledWith(-1);
  });

  it("replaces rather than pushes, so the dead entry is not left behind", () => {
    mockKey = "default";
    const { result } = renderHook(() => useGoBack("/grocery"));
    result.current();
    expect(navigate).toHaveBeenCalledWith("/grocery", { replace: true });
  });

  it("pops normally when there is in-app history", () => {
    mockKey = "abc123";
    const { result } = renderHook(() => useGoBack("/"));
    result.current();
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it("defaults the fallback to the app root", () => {
    mockKey = "default";
    const { result } = renderHook(() => useGoBack());
    result.current();
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  });
});
