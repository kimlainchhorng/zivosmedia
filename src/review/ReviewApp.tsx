/**
 * Isolated external-review surface for ZIVO Media (/review).
 *
 * Public, self-contained, presentation-only. It imports NO real feature code,
 * auth, Supabase client, or storage — only React, react-router, and local mock
 * snapshots. No review action can publish, follow, block, report, message,
 * upload media, or change privacy. Fictional data only.
 */
import { Link, Route, Routes, useSearchParams } from "react-router-dom";
import "./review.css";
import { EntityCardsGrid } from "./reviewShared";
import { MEDIA_PATHS, renderMediaSnapshot } from "./mediaSnapshots";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rv-root">
      <div className="rv-shell">
        <div className="rv-top">
          <Link className="rv-brand" to="/review"><span className="rv-brand__mark">Z</span> ZIVO Media · Review</Link>
          <span className="rv-demoonly">Demo only</span>
        </div>
        {children}
        <div className="rv-foot">Isolated review surface — fictional data, no real accounts, media, contacts, or actions.</div>
      </div>
    </div>
  );
}

function ReviewIndex() {
  return (
    <Shell>
      <div className="rv-hero">
        <h1>External review snapshots</h1>
        <p>Safe, fictional snapshots of the ZIVO Media experience for external review. Every screen is presentation-only.</p>
        <p className="rv-safe">🔒 No action here can publish, follow, block, report, message, upload media, or change privacy. No real profile, conversation, contact, phone number, media, token, or credential is exposed.</p>
      </div>

      <h2 style={{ fontSize: 15, margin: "6px 0 0" }}>Media snapshots</h2>
      <ul className="rv-grid">
        {MEDIA_PATHS.map((p) => (
          <li key={p}>
            <Link className="rv-link" to={`/review/snapshot/media?path=${p}`}>{p.replace("/media/", "").replace(/-/g, " ")}<small>{p}</small></Link>
          </li>
        ))}
      </ul>

      <h2 style={{ fontSize: 15, margin: "6px 0 0" }}>Cross-app entity cards</h2>
      <EntityCardsGrid />
    </Shell>
  );
}

function MediaSnapshot() {
  const [params] = useSearchParams();
  const path = params.get("path") ?? "/media/feed";
  return (
    <Shell>
      <Link className="rv-back" to="/review">← All snapshots</Link>
      <p className="rv-muted">{path}</p>
      {renderMediaSnapshot(path)}
    </Shell>
  );
}

export default function ReviewApp() {
  return (
    <Routes>
      <Route path="/" element={<ReviewIndex />} />
      <Route path="/snapshot/media" element={<MediaSnapshot />} />
      <Route path="*" element={<ReviewIndex />} />
    </Routes>
  );
}
