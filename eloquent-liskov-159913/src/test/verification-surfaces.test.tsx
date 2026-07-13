/**
 * Surface-level tests: verifies the badge renders ONLY when the source
 * data is explicitly verified, across feed-card / reels-overlay /
 * comment / suggestion / profile patterns. We render simplified author
 * rows that mirror the real markup so the guard logic is exercised
 * without booting full pages (which require routers, auth, etc.).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import {
  verifiedUser,
  unverifiedUser,
  userMissingFlag,
  verifiedStore,
  unverifiedStore,
} from "@/test/fixtures/profiles";

const wrap = (ui: React.ReactElement) =>
  render(<TooltipProvider>{ui}</TooltipProvider>);

const FeedCardAuthor = ({ post }: { post: any }) => (
  <p>
    <span>{post.author_name}</span>
    {isBlueVerified(post.author_is_verified) && <VerifiedBadge size={14} />}
  </p>
);

const ReelsOverlayAuthor = ({ post }: { post: any }) => (
  <span>
    {post.source === "user" ? post.author_name : post.store_name}
    {(post.source === "user"
      ? isBlueVerified(post.author_is_verified)
      : isBlueVerified(post.store_is_verified)) && <VerifiedBadge size={14} />}
  </span>
);

const CommentRow = ({ comment }: { comment: any }) => (
  <p>
    <span>{comment.author_name}</span>
    {isBlueVerified(comment.author_is_verified) && <VerifiedBadge size={12} />}
  </p>
);

const SuggestedRow = ({ profile }: { profile: any }) => (
  <div>
    <span>{profile.full_name}</span>
    {isBlueVerified(profile.is_verified) && (
      <VerifiedBadge size={12} interactive={false} />
    )}
  </div>
);

const ProfileHeader = ({ profile }: { profile: any }) => (
  <h2>
    {profile.full_name}
    {isBlueVerified(profile.is_verified) && <VerifiedBadge size={18} />}
  </h2>
);

describe("Verified badge across surfaces", () => {
  describe("FeedCard", () => {
    it("shows badge for verified user post", () => {
      wrap(<FeedCardAuthor post={{ author_name: verifiedUser.full_name, author_is_verified: true }} />);
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
    it("hides badge for unverified user post", () => {
      wrap(<FeedCardAuthor post={{ author_name: unverifiedUser.full_name, author_is_verified: false }} />);
      expect(screen.queryByTestId("verified-badge")).toBeNull();
    });
    it("hides badge when verification flag is missing", () => {
      wrap(<FeedCardAuthor post={{ author_name: userMissingFlag.full_name }} />);
      expect(screen.queryByTestId("verified-badge")).toBeNull();
    });
  });

  describe("Reels overlay", () => {
    it("shows badge for verified store post", () => {
      wrap(
        <ReelsOverlayAuthor
          post={{ source: "store", store_name: verifiedStore.name, store_is_verified: true }}
        />,
      );
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
    it("hides badge for unverified store post", () => {
      wrap(
        <ReelsOverlayAuthor
          post={{ source: "store", store_name: unverifiedStore.name, store_is_verified: false }}
        />,
      );
      expect(screen.queryByTestId("verified-badge")).toBeNull();
    });
    it("shows badge for verified user post in overlay", () => {
      wrap(
        <ReelsOverlayAuthor
          post={{ source: "user", author_name: verifiedUser.full_name, author_is_verified: true }}
        />,
      );
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
  });

  describe("CommentsSheet", () => {
    it("shows badge per verified commenter", () => {
      wrap(<CommentRow comment={{ author_name: "A", author_is_verified: true }} />);
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
    it("renders nothing for unknown verification on comments", () => {
      wrap(<CommentRow comment={{ author_name: "A" }} />);
      expect(screen.queryByTestId("verified-badge")).toBeNull();
    });
  });

  describe("SuggestedUsersCarousel", () => {
    it("shows badge for verified suggestion", () => {
      wrap(<SuggestedRow profile={verifiedUser} />);
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
    it("hides badge for unverified suggestion", () => {
      wrap(<SuggestedRow profile={unverifiedUser} />);
      expect(screen.queryByTestId("verified-badge")).toBeNull();
    });
  });

  describe("PublicProfilePage", () => {
    it("shows badge in name row when verified", () => {
      wrap(<ProfileHeader profile={verifiedUser} />);
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
    it("renders no badge when verification data is missing", () => {
      wrap(<ProfileHeader profile={userMissingFlag} />);
      expect(screen.queryByTestId("verified-badge")).toBeNull();
    });
  });

  // ── New surfaces (post-rollout): chat, notifications, explore, QR,
  // live (chat + host + viewer + gift), dating. We mirror the real
  // markup so the badge guard logic is exercised end-to-end.
  const ChatSearchRow = ({ p }: { p: any }) => (
    <div>
      <span className="inline-flex items-center gap-1">
        <span>{p.full_name}</span>
        {isBlueVerified(p.is_verified) && <VerifiedBadge size={12} interactive={false} />}
      </span>
    </div>
  );
  const ChatHeader = ({ p }: { p: any }) => (
    <header>
      <span className="inline-flex items-center gap-1">
        <span>{p.full_name}</span>
        {isBlueVerified(p.is_verified) && <VerifiedBadge size={16} interactive={false} />}
      </span>
    </header>
  );
  const NotificationRow = ({ n }: { n: any }) => (
    <div>
      <span className="inline-flex items-center gap-1">
        <span>{n.actor_name}</span>
        {isBlueVerified(n.actor_is_verified) && <VerifiedBadge size={14} interactive={false} />}
      </span>
    </div>
  );
  const ExplorePeopleRow = ({ p }: { p: any }) => (
    <div>
      <span>{p.full_name}</span>
      {isBlueVerified(p.is_verified) && <VerifiedBadge size={14} interactive={false} />}
    </div>
  );
  const QrShareCard = ({ p }: { p: any }) => (
    <div>
      <h3 className="inline-flex items-center gap-1">
        <span>{p.full_name}</span>
        {isBlueVerified(p.is_verified) && <VerifiedBadge size={16} interactive={false} />}
      </h3>
    </div>
  );
  const LiveChatRow = ({ m }: { m: any }) => (
    <div>
      <span className="inline-flex items-center gap-0.5">
        {m.user_name}
        {isBlueVerified(m.user_is_verified) && <VerifiedBadge size={10} interactive={false} />}
      </span>
      <span>{m.text}</span>
    </div>
  );
  const LiveHostHeader = ({ s }: { s: any }) => (
    <header>
      <span>{s.host_name}</span>
      {isBlueVerified(s.host_is_verified) && <VerifiedBadge size={11} interactive={false} />}
    </header>
  );
  const LiveViewerRow = ({ v }: { v: any }) => (
    <div>
      <span className="inline-flex items-center gap-1">
        <span>{v.name}</span>
        {isBlueVerified(v.is_verified) && <VerifiedBadge size={11} interactive={false} />}
      </span>
    </div>
  );
  const DatingCard = ({ p }: { p: any }) => (
    <div>
      <h2>{p.full_name}</h2>
      {isBlueVerified(p.is_verified) && <VerifiedBadge size={16} interactive={false} />}
    </div>
  );

  describe("ChatHub search result", () => {
    it("shows badge for verified peer", () => {
      wrap(<ChatSearchRow p={{ full_name: "A", is_verified: true }} />);
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
    it("hides badge for unverified peer", () => {
      wrap(<ChatSearchRow p={{ full_name: "A", is_verified: false }} />);
      expect(screen.queryByTestId("verified-badge")).toBeNull();
    });
  });

  describe("PersonalChat header", () => {
    it("shows badge when peer is verified", () => {
      wrap(<ChatHeader p={{ full_name: "A", is_verified: true }} />);
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
    it("hides badge when peer profile is loading (null is_verified)", () => {
      wrap(<ChatHeader p={{ full_name: "A", is_verified: null }} />);
      expect(screen.queryByTestId("verified-badge")).toBeNull();
    });
  });

  describe("NotificationsPage row", () => {
    it("shows badge for verified actor", () => {
      wrap(<NotificationRow n={{ actor_name: "A", actor_is_verified: true }} />);
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
    it("hides badge when actor flag missing", () => {
      wrap(<NotificationRow n={{ actor_name: "A" }} />);
      expect(screen.queryByTestId("verified-badge")).toBeNull();
    });
  });

  describe("ExplorePage people search", () => {
    it("shows badge for verified result", () => {
      wrap(<ExplorePeopleRow p={verifiedUser} />);
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
    it("hides badge for unverified result", () => {
      wrap(<ExplorePeopleRow p={unverifiedUser} />);
      expect(screen.queryByTestId("verified-badge")).toBeNull();
    });
  });

  describe("QRProfilePage share card", () => {
    it("shows badge when account is verified", () => {
      wrap(<QrShareCard p={verifiedUser} />);
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
    it("hides badge for unverified account", () => {
      wrap(<QrShareCard p={unverifiedUser} />);
      expect(screen.queryByTestId("verified-badge")).toBeNull();
    });
  });

  describe("LiveStream chat / host / viewer / gift", () => {
    it("shows badge in chat row for verified sender", () => {
      wrap(<LiveChatRow m={{ user_name: "A", text: "hi", user_is_verified: true }} />);
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
    it("shows badge in gift chat row for verified sender", () => {
      wrap(<LiveChatRow m={{ user_name: "A", text: "sent Rose", user_is_verified: true }} />);
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
    it("shows badge in host header when host verified", () => {
      wrap(<LiveHostHeader s={{ host_name: "Host", host_is_verified: true }} />);
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
    it("shows badge in viewers list for verified viewer", () => {
      wrap(<LiveViewerRow v={{ name: "V", is_verified: true }} />);
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
    it("hides badge when verified flag is null (loading)", () => {
      wrap(<LiveChatRow m={{ user_name: "A", text: "hi", user_is_verified: null }} />);
      expect(screen.queryByTestId("verified-badge")).toBeNull();
    });
  });

  describe("DatingPage card", () => {
    it("renders the real VerifiedBadge for verified profile", () => {
      wrap(<DatingCard p={verifiedUser} />);
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });
    it("hides badge for unverified profile", () => {
      wrap(<DatingCard p={unverifiedUser} />);
      expect(screen.queryByTestId("verified-badge")).toBeNull();
    });
  });
});
