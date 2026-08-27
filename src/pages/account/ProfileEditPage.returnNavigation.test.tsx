import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

const mocks = vi.hoisted(() => ({
  profileLoading: true,
  profilePhone: "+12015550123",
  refetchProfile: vi.fn(),
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
}));

vi.mock("@/components/home/NavBar", () => ({
  default: () => null,
}));

vi.mock("@/components/auth/CountryPhoneInput", () => ({
  CountryPhoneInput: ({
    name,
    onBlur,
    onChange,
    value,
  }: {
    name?: string;
    onBlur?: () => void;
    onChange: (value: string) => void;
    value: string;
  }) => (
    <input
      aria-label="Phone"
      name={name}
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    />
  ),
}));

vi.mock("@/components/account/PhoneVerificationDialog", () => ({
  PhoneVerificationDialog: () => null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "rider@example.com" },
  }),
}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        "profile.email": "Email",
        "profile.phone": "Phone",
        "profile.phone_required_desc": "Add a phone number to continue.",
        "profile.phone_required_title": "Phone number required",
        "profile.save": "Save",
        "profile.saving": "Saving...",
      })[key] ?? key,
  }),
}));

vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => ({
    data: {
      full_name: "Rider One",
      phone: mocks.profilePhone,
    },
    isLoading: mocks.profileLoading,
    refetch: (...args: unknown[]) => mocks.refetchProfile(...args),
  }),
  useUpdateUserProfile: () => ({
    isPending: false,
    mutateAsync: (...args: unknown[]) => mocks.updateProfile(...args),
  }),
  useUploadAvatar: () => ({
    isPending: false,
    mutateAsync: (...args: unknown[]) => mocks.uploadAvatar(...args),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import ProfileEditPage from "./ProfileEditPage";

const PREVIOUS_ROUTE = "/previous";

class IntersectionObserverStub {
  disconnect() {}
  observe() {}
  unobserve() {}
}

function RouteProbe() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div>
      <output aria-label="Current route">
        {location.pathname + location.search + location.hash}
      </output>
      <button type="button" onClick={() => navigate(-1)}>
        History back
      </button>
    </div>
  );
}

function CurrentRouteOutput() {
  const location = useLocation();
  return (
    <output aria-label="Current profile route">
      {location.pathname + location.search + location.hash}
    </output>
  );
}

function renderProfileEdit(entry: string) {
  return render(
    <MemoryRouter initialEntries={[PREVIOUS_ROUTE, entry]} initialIndex={1}>
      <Routes>
        <Route
          path="/account/profile-edit"
          element={
            <>
              <ProfileEditPage />
              <CurrentRouteOutput />
            </>
          }
        />
        <Route path="*" element={<RouteProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

const profileEditEntry = (redirect?: string) =>
  redirect === undefined
    ? "/account/profile-edit"
    : `/account/profile-edit?redirect=${encodeURIComponent(redirect)}`;

describe("ProfileEditPage return navigation", () => {
  beforeEach(() => {
    mocks.profileLoading = true;
    mocks.profilePhone = "+12015550123";
    mocks.refetchProfile.mockReset().mockResolvedValue({
      data: { full_name: "Rider One", phone: mocks.profilePhone },
    });
    mocks.updateProfile.mockReset().mockResolvedValue(undefined);
    mocks.uploadAvatar.mockReset().mockResolvedValue(undefined);
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("returns to an encoded internal Ride route and replaces the profile-edit history entry", () => {
    renderProfileEdit(profileEditEntry("/rides/hub"));

    fireEvent.click(
      screen.getByRole("button", { name: "Back to ZIVO Ride" }),
    );
    expect(screen.getByLabelText("Current route")).toHaveTextContent(
      "/rides/hub",
    );

    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    expect(screen.getByLabelText("Current route")).toHaveTextContent(
      PREVIOUS_ROUTE,
    );
  });

  it.each([
    ["absolute", "https://evil.test/phish"],
    ["protocol-relative", "//evil.test/phish"],
    ["backslash-authority", "/\\evil.test/phish"],
  ])("falls back to history for an unsafe %s redirect", (_label, redirect) => {
    renderProfileEdit(profileEditEntry(redirect));

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Current route")).toHaveTextContent(
      PREVIOUS_ROUTE,
    );
  });

  it("keeps ordinary history Back behavior when no redirect is present", () => {
    renderProfileEdit(profileEditEntry());

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Current route")).toHaveTextContent(
      PREVIOUS_ROUTE,
    );
  });

  it("returns to Ride after the main profile form saves successfully", async () => {
    mocks.profileLoading = false;
    mocks.profilePhone = "";
    mocks.refetchProfile.mockResolvedValue({
      data: { full_name: "Rider One", phone: "+12015550123" },
    });
    renderProfileEdit(profileEditEntry("/rides/hub"));

    fireEvent.change(screen.getByRole("textbox", { name: "Phone" }), {
      target: { value: "+12015550123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save & return to Ride" }),
    );

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        full_name: "Rider One",
        phone: "+12015550123",
      });
      expect(mocks.refetchProfile).toHaveBeenCalledOnce();
      expect(screen.getByLabelText("Current route")).toHaveTextContent(
        "/rides/hub",
      );
    }, { timeout: 5_000 });
  });

  it("saves other profile changes without entering a phone-return loop", async () => {
    mocks.profileLoading = false;
    mocks.profilePhone = "";
    renderProfileEdit(profileEditEntry("/rides/hub"));

    fireEvent.change(screen.getByRole("textbox", { name: "First Name" }), {
      target: { value: "Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        full_name: "Updated One",
        phone: null,
      });
    });
    expect(mocks.refetchProfile).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Current profile route")).toHaveTextContent(
      profileEditEntry("/rides/hub"),
    );
  });

  it("stays on Profile when the refreshed cache cannot verify the saved phone", async () => {
    mocks.profileLoading = false;
    mocks.profilePhone = "";
    mocks.refetchProfile.mockResolvedValue({ data: null });
    renderProfileEdit(profileEditEntry("/rides/hub"));

    fireEvent.change(screen.getByRole("textbox", { name: "Phone" }), {
      target: { value: "+12015550123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save & return to Ride" }),
    );

    await waitFor(() => expect(mocks.refetchProfile).toHaveBeenCalledOnce());
    expect(screen.getByLabelText("Current profile route")).toHaveTextContent(
      profileEditEntry("/rides/hub"),
    );
  });
});
