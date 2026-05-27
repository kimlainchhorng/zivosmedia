import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileCompletenessCard from "./ProfileCompletenessCard";
import type { UserProfile } from "@/hooks/useUserProfile";

const baseProfile: UserProfile = {
  id: "p1",
  user_id: "u1",
  full_name: null,
  email: null,
  phone: null,
  avatar_url: null,
  is_verified: null,
  cover_url: null,
  cover_position: null,
  status: null,
  bio: null,
  social_facebook: null,
  social_onlyfans: null,
  social_instagram: null,
  social_tiktok: null,
  social_snapchat: null,
  social_x: null,
  social_linkedin: null,
  social_telegram: null,
  social_links_visible: null,
  comment_control: null,
  hide_like_counts: null,
  allow_mentions: null,
  allow_sharing: null,
  allow_friend_requests: null,
  hide_from_drivers: null,
  profile_visibility: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const noopHandlers = {
  onPickAvatar: vi.fn(),
  onPickCover: vi.fn(),
  onEditBio: vi.fn(),
  onEditPhone: vi.fn(),
  onEditUsername: vi.fn(),
  onEditName: vi.fn(),
  onEditSocials: vi.fn(),
  onStartVerification: vi.fn(),
};

describe("ProfileCompletenessCard", () => {
  it("renders 0% with all 8 actions when profile is empty", () => {
    render(
      <ProfileCompletenessCard
        profile={baseProfile}
        username={null}
        isVerified={false}
        {...noopHandlers}
      />,
    );

    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("0/8 done · 8 left")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
  });

  it("counts done items and updates percentage", () => {
    const partial: UserProfile = {
      ...baseProfile,
      avatar_url: "https://example.com/a.png",
      cover_url: "https://example.com/c.png",
      full_name: "Jane Doe",
      bio: "Hello",
    };
    render(
      <ProfileCompletenessCard
        profile={partial}
        username="jane"
        isVerified={false}
        {...noopHandlers}
      />,
    );
    // 5 done out of 8 → 63%
    expect(screen.getByText("5/8 done · 3 left")).toBeInTheDocument();
    expect(screen.getByText("63%")).toBeInTheDocument();
  });

  it("returns null when 100% complete", () => {
    const complete: UserProfile = {
      ...baseProfile,
      avatar_url: "a",
      cover_url: "c",
      full_name: "Full Name",
      bio: "Bio text",
      phone: "+15551234567",
      social_instagram: "https://instagram.com/x",
      is_verified: true,
    };
    const { container } = render(
      <ProfileCompletenessCard
        profile={complete}
        username="someuser"
        isVerified={true}
        {...noopHandlers}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("invokes the matching handler when an incomplete item is clicked", () => {
    const handlers = {
      onPickAvatar: vi.fn(),
      onPickCover: vi.fn(),
      onEditBio: vi.fn(),
      onEditPhone: vi.fn(),
      onEditUsername: vi.fn(),
      onEditName: vi.fn(),
      onEditSocials: vi.fn(),
      onStartVerification: vi.fn(),
    };
    render(
      <ProfileCompletenessCard
        profile={baseProfile}
        username={null}
        isVerified={false}
        {...handlers}
      />,
    );

    fireEvent.click(screen.getByText("Add a profile photo"));
    fireEvent.click(screen.getByText("Verify your phone"));
    fireEvent.click(screen.getByText("Link a social account"));

    expect(handlers.onPickAvatar).toHaveBeenCalledTimes(1);
    expect(handlers.onEditPhone).toHaveBeenCalledTimes(1);
    expect(handlers.onEditSocials).toHaveBeenCalledTimes(1);
    expect(handlers.onStartVerification).not.toHaveBeenCalled();
  });

  it("does not fire handler when a completed item is clicked", () => {
    const handlers = { ...noopHandlers, onPickAvatar: vi.fn() };
    render(
      <ProfileCompletenessCard
        profile={{ ...baseProfile, avatar_url: "a" }}
        username={null}
        isVerified={false}
        {...handlers}
      />,
    );
    const item = screen.getByText("Add a profile photo").closest("button")!;
    expect(item).toBeDisabled();
    fireEvent.click(item);
    expect(handlers.onPickAvatar).not.toHaveBeenCalled();
  });

  it("treats whitespace-only fields as not done", () => {
    render(
      <ProfileCompletenessCard
        profile={{ ...baseProfile, full_name: "   ", bio: "\n\t" }}
        username={null}
        isVerified={false}
        {...noopHandlers}
      />,
    );
    expect(screen.getByText("0/8 done · 8 left")).toBeInTheDocument();
  });

  it("shows 'Verification pending' label when applicable", () => {
    render(
      <ProfileCompletenessCard
        profile={baseProfile}
        username={null}
        isVerified={false}
        verificationPending
        {...noopHandlers}
      />,
    );
    expect(screen.getByText("Verification pending")).toBeInTheDocument();
    expect(screen.queryByText("Get blue verified")).not.toBeInTheDocument();
  });
});
