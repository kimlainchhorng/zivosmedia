/**
 * Shared inert presentation primitives for the /review surface.
 *
 * SAFETY: everything here is presentation-only. Buttons carry no handlers (or only
 * a demo no-op), so no review action can publish, follow, block, report, message,
 * upload, pay, call, or change any real state. All data is fictional. No real app
 * hook, Supabase client, auth, or storage is imported.
 */
import type { ReactNode } from "react";

export function Avatar({ label, sm = false }: { label: string; sm?: boolean }) {
  return <span className={sm ? "rv-avatar rv-avatar--sm" : "rv-avatar"} aria-hidden>{label.charAt(0).toUpperCase()}</span>;
}

export function Frame({ title, icons, children }: { title: string; icons?: ReactNode; children: ReactNode }) {
  return (
    <div className="rv-frame">
      <div className="rv-appbar">
        <strong>{title}</strong>
        {icons ? <span className="rv-appbar__icons">{icons}</span> : null}
      </div>
      <div className="rv-body">{children}</div>
    </div>
  );
}

/** A control that visibly does nothing — reinforces "no real action". */
export function InertButton({ children, variant = "" }: { children: ReactNode; variant?: string }) {
  return (
    <button type="button" className={`rv-btn ${variant}`} aria-disabled title="Demo only — inert in review" onClick={(e) => e.preventDefault()}>
      {children}
    </button>
  );
}

export function DemoNote({ children }: { children: ReactNode }) {
  return <p className="rv-note rv-note--demo">🔒 {children}</p>;
}

export function StateScreen({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rv-state" role="status">
      <span className="rv-state__ico" aria-hidden>{icon}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

/* ── Cross-app entity cards (presentation-only, opaque fixture IDs) ───────────── */

type Field = { k: string; v: string };
export interface EntityCardData {
  type: string;
  title: string;
  id: string; // opaque fixture id
  fields: Field[];
  pills: { text: string; tone: "pos" | "neg" | "warn" | "info" }[];
}

export const ENTITY_CARDS: EntityCardData[] = [
  { type: "Driver", title: "Rider · Sok D.", id: "drv_9f3a…c21", fields: [{ k: "Vehicle", v: "Moto · plate hidden" }, { k: "Rating", v: "4.9 ★" }, { k: "Zone", v: "Riverside" }], pills: [{ text: "Verified", tone: "pos" }, { text: "Contact relayed", tone: "info" }] },
  { type: "Trip", title: "Trip to Daun Penh", id: "trp_71b2…8ad", fields: [{ k: "Status", v: "In progress" }, { k: "ETA", v: "8 min" }, { k: "Fare", v: "$3.20" }], pills: [{ text: "Location shared for trip only", tone: "info" }] },
  { type: "Hotel", title: "Riverside Boutique", id: "htl_04c8…3e1", fields: [{ k: "Rating", v: "4.6 ★" }, { k: "From", v: "$48 / night" }, { k: "Area", v: "Daun Penh" }], pills: [{ text: "Preview", tone: "info" }] },
  { type: "Booking", title: "2 nights · Sep 4–6", id: "bkg_5da1…9f0", fields: [{ k: "Status", v: "Confirmed" }, { k: "Guests", v: "2" }, { k: "Total", v: "$96.00" }], pills: [{ text: "Auth required to view", tone: "warn" }] },
  { type: "Business", title: "Sokha Coffee & Roastery", id: "biz_2f77…b45", fields: [{ k: "Category", v: "Café" }, { k: "Rating", v: "4.8 ★" }, { k: "Open", v: "07:00–20:00" }], pills: [{ text: "Verified merchant", tone: "pos" }] },
  { type: "Order", title: "Order #A-4821", id: "ord_9c10…7de", fields: [{ k: "Status", v: "Preparing" }, { k: "Items", v: "3" }, { k: "Total", v: "$8.75" }], pills: [{ text: "Preview", tone: "info" }] },
  { type: "Invoice", title: "Invoice #INV-2043", id: "inv_6b3e…a92", fields: [{ k: "Status", v: "Due" }, { k: "Amount", v: "$120.00" }, { k: "Due", v: "Sep 12" }], pills: [{ text: "Manual review required", tone: "warn" }] },
  { type: "Wallet payment status", title: "Top-up", id: "pay_8ae4…10c", fields: [{ k: "Status", v: "Processing" }, { k: "Amount", v: "$20.00" }, { k: "Method", v: "Card ••4242" }], pills: [{ text: "No client secret", tone: "pos" }, { text: "Never auto-pays", tone: "pos" }] }
];

export function EntityCard({ card }: { card: EntityCardData }) {
  return (
    <li className="rv-card">
      <div className="rv-card__head">
        <span className="rv-card__type">{card.type}</span>
        <span className="rv-muted">{card.id}</span>
      </div>
      <span className="rv-card__title">{card.title}</span>
      <dl>{card.fields.map((f) => (<div key={f.k} style={{ display: "contents" }}><dt>{f.k}</dt><dd>{f.v}</dd></div>))}</dl>
      <div className="rv-card__foot">
        {card.pills.map((p) => <span key={p.text} className={`rv-pill rv-pill--${p.tone}`}>{p.text}</span>)}
      </div>
    </li>
  );
}

export function EntityCardsGrid() {
  return (
    <>
      <ul className="rv-cards">{ENTITY_CARDS.map((c) => <EntityCard key={c.id} card={c} />)}</ul>
      <DemoNote>Cards use opaque fixture IDs. In the real app they require authentication and a blocked-user state prevents access. Nothing here auto-pays, approves a refund, releases a transfer, or opens an admin action.</DemoNote>
    </>
  );
}
