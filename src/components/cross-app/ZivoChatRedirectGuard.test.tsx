import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const openExternalUrl = vi.fn();
vi.mock("@/lib/openExternalUrl", () => ({
  openExternalUrl: (...args: unknown[]) => openExternalUrl(...args),
}));

import ZivoChatRedirectGuard from "./ZivoChatRedirectGuard";
import { setZivoChatSurface } from "@/config/zivoChatDomain";

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current path">{location.pathname}</output>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <LocationProbe />
              <ZivoChatRedirectGuard />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  openExternalUrl.mockClear();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("ZivoChatRedirectGuard", () => {
  // The whole point of the change: reading your messages must not require
  // installing a second app. Chat and the super-app share one Supabase project,
  // so there is no data reason to force the hop.
  it("keeps standalone chat in the super-app by default", () => {
    const { getByLabelText } = renderAt("/chat");

    expect(openExternalUrl).not.toHaveBeenCalled();
    expect(getByLabelText("current path")).toHaveTextContent("/chat");
  });

  it("stays in-app for chat sub-routes and channels too", () => {
    for (const path of ["/chat/contacts", "/channels", "/direct/t/abc"]) {
      openExternalUrl.mockClear();
      renderAt(path);
      expect(openExternalUrl).not.toHaveBeenCalled();
    }
  });

  // The dedicated app stays on offer -- the banner's "Always use app" writes
  // this preference, and then the handoff resumes.
  it("hands off to ZIVO Chat once the user opts in, carrying the deep link", () => {
    setZivoChatSurface("dedicated-app");
    renderAt("/chat");

    expect(openExternalUrl).toHaveBeenCalledWith("https://zivoschat.com/chat");
  });

  it("never touches the /connect/chat SSO issuer page", () => {
    setZivoChatSurface("dedicated-app");
    renderAt("/connect/chat");

    expect(openExternalUrl).not.toHaveBeenCalled();
  });

  it("leaves embedded contextual chat alone even when opted in", () => {
    setZivoChatSurface("dedicated-app");
    renderAt("/delivery/track/abc/chat");

    expect(openExternalUrl).not.toHaveBeenCalled();
  });
});
