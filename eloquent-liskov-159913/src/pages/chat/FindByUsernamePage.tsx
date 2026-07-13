/**
 * FindByUsernamePage — type `@kim`, find a user, open their profile.
 *
 * Closes the loop on the public-username deep link: now you can both share
 * your own `/@<username>` link AND look anyone up by their handle.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import AtSign from "lucide-react/dist/esm/icons/at-sign";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import UserX from "lucide-react/dist/esm/icons/user-x";
import X from "lucide-react/dist/esm/icons/x";
import SEOHead from "@/components/SEOHead";

interface Match {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

const USERNAME_RE = /^[a-zA-Z0-9_.]{2,32}$/;

export default function FindByUsernamePage() {
  const navigate = useNavigate();
  const [raw, setRaw] = useState("");
  const [match, setMatch] = useState<Match | null>(null);
  const [status, setStatus] = useState<"idle" | "searching" | "found" | "not_found" | "invalid">("idle");

  // Strip a leading `@` so users can paste either `@kim` or `kim`.
  const handle = useMemo(() => raw.trim().replace(/^@/, ""), [raw]);

  useEffect(() => {
    if (handle.length === 0) {
      setStatus("idle");
      setMatch(null);
      return;
    }
    if (!USERNAME_RE.test(handle)) {
      setStatus("invalid");
      setMatch(null);
      return;
    }
    let cancelled = false;
    setStatus("searching");
    const t = window.setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, full_name, avatar_url")
        .ilike("username", handle)
        .maybeSingle();
      if (cancelled) return;
      const row = data as Match | null;
      if (row?.user_id) {
        setMatch(row);
        setStatus("found");
      } else {
        setMatch(null);
        setStatus("not_found");
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [handle]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title="Find by username" description="Find anyone on ZIVO by their @username" />
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30 safe-area-top">
        <div className="px-3 py-2 flex items-center gap-2">
          <button type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="h-11 w-11 flex items-center justify-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-ig-gradient">Find by username</h1>
        </div>
      </div>

      {/* Search input */}
      <div className="p-4">
        <div className="relative">
          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="username"
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full pl-9 pr-10 py-3 rounded-xl bg-muted/50 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
          />
          {raw && (
            <button type="button"
              onClick={() => setRaw("")}
              aria-label="Clear"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 px-1">
          Letters, numbers, dots and underscores. 2–32 characters.
        </p>
      </div>

      {/* Result */}
      <div className="flex-1 px-4 pb-8">
        {status === "idle" && (
          <p className="text-center text-sm text-muted-foreground py-12">
            Start typing a @username to find someone
          </p>
        )}

        {status === "invalid" && handle.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">
            That username isn't valid yet — keep typing.
          </p>
        )}

        {status === "searching" && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {status === "found" && match && (
          <button type="button"
            onClick={() => navigate(`/user/${match.user_id}`)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/30 hover:bg-muted/50 active:scale-[0.99] transition text-left"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={match.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {(match.full_name || match.username || "?").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-foreground truncate">
                {match.full_name || (match.username ? `@${match.username}` : "ZIVO user")}
              </p>
              {match.username && match.full_name && (
                <p className="text-xs text-muted-foreground truncate">@{match.username}</p>
              )}
            </div>
            <span className="text-xs font-semibold text-primary shrink-0">View</span>
          </button>
        )}

        {status === "not_found" && (
          <div className="flex flex-col items-center text-center py-12 px-6">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <UserX className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">@{handle}</p>
            <p className="text-xs text-muted-foreground mt-1">
              No one with that username on ZIVO yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
