// LegalAcknowledgment — checkbox + clickable doc list. Records the
// acceptance both in localStorage (for UX) and via the
// record_legal_acknowledgment RPC (for server-side proof + the
// edge-function legal-ack gate).

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "zivo-legal-ack";

interface Doc { title: string; href: string }
interface AckRecord { version: string; accepted_at: string; documents: string[] }

export interface LegalAcknowledgmentProps {
  version: string;
  documents: Doc[];
  onChange: (accepted: boolean) => void;
  className?: string;
}

const readAck = (): AckRecord | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AckRecord) : null;
  } catch { return null; }
};

export default function LegalAcknowledgment({ version, documents, onChange, className }: LegalAcknowledgmentProps) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const prev = readAck();
    const stillValid = prev?.version === version
      && documents.every((d) => prev.documents.includes(d.href));
    if (stillValid) { setAccepted(true); onChange(true); }
    else { setAccepted(false); onChange(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, documents.length]);

  const toggle = (next: boolean) => {
    setAccepted(next);
    onChange(next);
    if (next) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          version, accepted_at: new Date().toISOString(),
          documents: documents.map((d) => d.href),
        }));
      } catch { /* noop */ }
      const rpc = supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      Promise.all(documents.map((d) =>
        rpc("record_legal_acknowledgment", {
          p_role: "customer",
          p_document_key: d.href.replace(/^\/legal\//, ""),
          p_document_version: version,
          p_meta: { client: "myzivo", path: typeof window !== "undefined" ? window.location.pathname : null },
        })
      )).catch(() => { /* non-fatal */ });
    }
  };

  return (
    <div className={"rounded-xl border border-border/60 bg-card p-3 flex items-start gap-3 " + (className ?? "")}>
      <Checkbox
        id="legal-ack" checked={accepted}
        onCheckedChange={(v) => toggle(v === true)}
        className="mt-0.5"
      />
      <label htmlFor="legal-ack" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
        I have read and agree to the{" "}
        {documents.map((d, i) => (
          <span key={d.href}>
            {i > 0 && (i === documents.length - 1 ? " and " : ", ")}
            <Link to={d.href} target="_blank" rel="noreferrer"
              className="text-primary underline inline-flex items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}>
              {d.title}<ExternalLink className="h-3 w-3" />
            </Link>
          </span>
        ))}
        . I understand this order creates a contract directly with the driver.
      </label>
    </div>
  );
}
