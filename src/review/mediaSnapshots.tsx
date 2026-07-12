/**
 * Fictional media snapshots for /review/snapshot/media?path=…
 * All accounts, content, comments, counts, and images are invented. Every action
 * is inert: nothing publishes, follows, blocks, reports, messages, uploads, or
 * changes privacy. No real profile, media URL, phone number, or contact appears.
 */
import { Avatar, DemoNote, Frame, InertButton, StateScreen } from "./reviewShared";

const U = {
  maya: { name: "Maya Chen", handle: "@maya.creates" },
  dara: { name: "Dara Sok", handle: "@darasok" },
  nita: { name: "Nita R.", handle: "@nita.rides" },
  vibol: { name: "Vibol", handle: "@vibol.eats" }
};

function PostCard({ user, caption, likes, comments, wide = false }: { user: { name: string; handle: string }; caption: string; likes: string; comments: string; wide?: boolean }) {
  return (
    <div className="rv-post">
      <div className="rv-userrow">
        <Avatar label={user.name} />
        <div className="rv-userrow__name"><b>{user.name}</b><span>{user.handle}</span></div>
      </div>
      <div className={wide ? "rv-media rv-media--wide" : "rv-media"} aria-label="Fictional image">Sample image</div>
      <div className="rv-actions">
        <button type="button" aria-disabled title="Demo only">♥ {likes}</button>
        <button type="button" aria-disabled title="Demo only">💬 {comments}</button>
        <button type="button" aria-disabled title="Demo only">↗ Share</button>
      </div>
      <p className="rv-caption"><b>{user.handle}</b> {caption}</p>
    </div>
  );
}

function ProfileHeader({ user, followers, priv = false }: { user: { name: string; handle: string }; followers: string; priv?: boolean }) {
  return (
    <div className="rv-post">
      <div className="rv-userrow">
        <Avatar label={user.name} />
        <div className="rv-userrow__name"><b>{user.name} {priv ? "🔒" : ""}</b><span>{user.handle}</span></div>
      </div>
      <div style={{ display: "flex", gap: 18, fontSize: 13 }}>
        <span><b>128</b> posts</span><span><b>{followers}</b> followers</span><span><b>310</b> following</span>
      </div>
    </div>
  );
}

export function renderMediaSnapshot(path: string) {
  switch (path) {
    case "/media/feed":
      return (
        <Frame title="Feed" icons={<>🔔 ✉️</>}>
          <PostCard user={U.maya} caption="Golden hour by the river 🌅 #phnompenh" likes="1,204" comments="86" />
          <PostCard user={U.vibol} caption="Best noodle stall in town, hands down." likes="642" comments="41" wide />
          <DemoNote>Fictional posts. Like/comment/share/follow are inert in review.</DemoNote>
        </Frame>
      );
    case "/media/post":
      return (
        <Frame title="Post">
          <PostCard user={U.maya} caption="Golden hour by the river 🌅" likes="1,204" comments="86" />
          <ul className="rv-list">
            <li className="rv-row"><Avatar label="Dara" sm /><div className="rv-row__body"><b>{U.dara.handle}</b><span>This is stunning ✨</span></div></li>
            <li className="rv-row"><Avatar label="Nita" sm /><div className="rv-row__body"><b>{U.nita.handle}</b><span>Where is this?</span></div></li>
          </ul>
          <DemoNote>Comment composer is disabled — no message or comment can be sent.</DemoNote>
        </Frame>
      );
    case "/media/profile":
      return (
        <Frame title="Your profile" icons={<>⚙️</>}>
          <ProfileHeader user={U.maya} followers="24.1k" />
          <div style={{ display: "flex", gap: 8 }}><InertButton variant="rv-btn--ghost">Edit profile</InertButton><InertButton variant="rv-btn--ghost">Share</InertButton></div>
          <div className="rv-tiles">{Array.from({ length: 9 }).map((_, i) => <span key={i} className="rv-tile" />)}</div>
        </Frame>
      );
    case "/media/other-profile":
      return (
        <Frame title="Profile">
          <ProfileHeader user={U.dara} followers="5,902" />
          <div style={{ display: "flex", gap: 8 }}><InertButton>Follow</InertButton><InertButton variant="rv-btn--ghost">Message</InertButton></div>
          <div className="rv-tiles">{Array.from({ length: 9 }).map((_, i) => <span key={i} className="rv-tile" />)}</div>
          <DemoNote>Follow / message are inert. Phone numbers are never shown on profiles.</DemoNote>
        </Frame>
      );
    case "/media/search":
      return (
        <Frame title="Search">
          <div style={{ padding: "10px 12px", border: "1px solid var(--rv-line)", borderRadius: 11, color: "var(--rv-muted)" }}>🔎 Search people, tags, places…</div>
          <ul className="rv-list">
            {[U.maya, U.dara, U.nita, U.vibol].map((u) => (
              <li key={u.handle} className="rv-row"><Avatar label={u.name} sm /><div className="rv-row__body"><b>{u.name}</b><span>{u.handle}</span></div><span className="rv-row__meta">Follow</span></li>
            ))}
          </ul>
        </Frame>
      );
    case "/media/discovery":
      return (
        <Frame title="Discover">
          <div className="rv-tiles">{Array.from({ length: 12 }).map((_, i) => <span key={i} className="rv-tile" />)}</div>
          <DemoNote>Trending fictional media. Tapping a tile opens a preview only.</DemoNote>
        </Frame>
      );
    case "/media/notifications":
      return (
        <Frame title="Notifications">
          <ul className="rv-list">
            <li className="rv-row"><Avatar label="Dara" sm /><div className="rv-row__body"><b>{U.dara.handle}</b><span>started following you</span></div><span className="rv-row__meta">2h</span></li>
            <li className="rv-row"><Avatar label="Nita" sm /><div className="rv-row__body"><b>{U.nita.handle}</b><span>liked your post</span></div><span className="rv-row__meta">5h</span></li>
            <li className="rv-row"><Avatar label="Vibol" sm /><div className="rv-row__body"><b>{U.vibol.handle}</b><span>mentioned you in a comment</span></div><span className="rv-row__meta">1d</span></li>
          </ul>
        </Frame>
      );
    case "/media/messages-entry":
      return (
        <Frame title="Messages" icons={<>✏️</>}>
          <ul className="rv-list">
            <li className="rv-row"><Avatar label="Dara" sm /><div className="rv-row__body"><b>{U.dara.name}</b><span>See you there!</span></div><span className="rv-row__meta">2h</span></li>
            <li className="rv-row"><Avatar label="Nita" sm /><div className="rv-row__body"><b>{U.nita.name}</b><span>📷 Photo</span></div><span className="rv-row__meta">1d</span></li>
          </ul>
          <DemoNote>Opening a thread continues in ZIVO Chat. In review, messaging is inert — nothing can be sent.</DemoNote>
        </Frame>
      );
    case "/media/privacy":
      return (
        <Frame title="Privacy">
          <ul className="rv-list">
            <li className="rv-row"><div className="rv-row__body"><b>Private account</b><span>Only approved followers see your posts</span></div><span className="rv-row__meta">Off</span></li>
            <li className="rv-row"><div className="rv-row__body"><b>Show phone number</b><span>Never shown to others</span></div><span className="rv-row__meta">Hidden</span></li>
            <li className="rv-row"><div className="rv-row__body"><b>Message requests</b><span>From people you don’t follow</span></div><span className="rv-row__meta">Filtered</span></li>
            <li className="rv-row"><div className="rv-row__body"><b>Activity status</b><span>Show when you’re active</span></div><span className="rv-row__meta">Off</span></li>
          </ul>
          <DemoNote>Read-only snapshot. Toggling a privacy setting is inert in review — nothing is saved.</DemoNote>
        </Frame>
      );
    case "/media/blocked-user":
      return (
        <Frame title="Profile">
          <StateScreen icon="🚫" title="You blocked this account" body="You can’t see their posts or message them, and they can’t contact you. Unblocking is disabled in review." />
          <InertButton variant="rv-btn--ghost rv-btn--full">Unblock</InertButton>
        </Frame>
      );
    case "/media/muted-user":
      return (
        <Frame title="Profile">
          <ProfileHeader user={U.vibol} followers="12.3k" />
          <span className="rv-pill rv-pill--warn">Muted</span>
          <p className="rv-muted">You won’t see their posts in your feed. They aren’t notified. Unmuting is inert in review.</p>
          <InertButton variant="rv-btn--ghost rv-btn--full">Unmute</InertButton>
        </Frame>
      );
    case "/media/report":
      return (
        <Frame title="Report">
          <p className="rv-caption">Why are you reporting this post?</p>
          <ul className="rv-list">
            {["Spam", "Nudity or sexual content", "Hate speech or symbols", "Violence", "Scam or fraud", "I just don’t like it"].map((r) => (
              <li key={r} className="rv-row"><div className="rv-row__body"><b>{r}</b></div><span className="rv-row__meta">›</span></li>
            ))}
          </ul>
          <DemoNote>Submitting a report is inert in review — no report state changes.</DemoNote>
        </Frame>
      );
    case "/media/empty":
      return <Frame title="Feed"><StateScreen icon="🌱" title="Nothing here yet" body="Follow a few creators and their posts will show up in your feed." /></Frame>;
    case "/media/offline":
      return <Frame title="Feed"><StateScreen icon="📡" title="You’re offline" body="Showing what we last loaded. New posts and actions resume when you reconnect." /></Frame>;
    case "/media/error":
      return <Frame title="Feed"><StateScreen icon="⚠️" title="Something went wrong" body="We couldn’t load the feed. Pull to refresh or try again in a moment." /></Frame>;
    default:
      return <Frame title="Not found"><StateScreen icon="❓" title="Unknown snapshot" body={`No media snapshot for "${path}".`} /></Frame>;
  }
}

export const MEDIA_PATHS = [
  "/media/feed", "/media/post", "/media/profile", "/media/other-profile", "/media/search",
  "/media/discovery", "/media/notifications", "/media/messages-entry", "/media/privacy",
  "/media/blocked-user", "/media/muted-user", "/media/report", "/media/empty", "/media/offline", "/media/error"
];
