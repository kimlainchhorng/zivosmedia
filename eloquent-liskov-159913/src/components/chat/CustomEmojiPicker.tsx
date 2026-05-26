/**
 * CustomEmojiPicker — group-scoped custom emoji grid + browser fallbacks.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EmojiEntry { id: string; label: string; image_url: string }
interface Pack { id: string; name: string; emojis: EmojiEntry[] }

interface Props {
  groupId?: string;
  onPick: (emoji: { kind: "emoji" | "custom"; value: string; image?: string }) => void;
}

const STANDARD = ["👍","❤️","😂","🔥","🎉","😮","😢","😍","🤔","🙏","👏","💯"];

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function CustomEmojiPicker({ groupId, onPick }: Props) {
  const [packs, setPacks] = useState<Pack[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = (dbFrom("custom_emoji_packs") as { select: (s: string) => { or: (q: string) => Promise<{ data: Pack[] | null }> } })
        .select("id, name, emojis")
        .or(`is_public.eq.true${groupId ? `,group_id.eq.${groupId}` : ""}`);
      const { data } = await q;
      if (!cancelled) setPacks((data as Pack[] | null) || []);
    })();
    return () => { cancelled = true; };
  }, [groupId]);

  return (
    <div className="rounded-2xl bg-card border border-border/40 p-3 shadow-lg max-w-[320px]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Reactions</p>
      <div className="grid grid-cols-6 gap-1.5 mb-3">
        {STANDARD.map((e) => (
          <button type="button" key={e} onClick={() => onPick({ kind: "emoji", value: e })} className="h-9 text-xl rounded-lg hover:bg-muted active:scale-90 transition">
            {e}
          </button>
        ))}
      </div>
      {packs.map((pack) => (
        <div key={pack.id} className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{pack.name}</p>
          <div className="grid grid-cols-6 gap-1.5">
            {pack.emojis.map((e) => (
              <button type="button" key={e.id} onClick={() => onPick({ kind: "custom", value: e.label, image: e.image_url })} className="h-9 rounded-lg hover:bg-muted active:scale-90 transition flex items-center justify-center">
	                <img
	                  src={e.image_url}
	                  alt={e.label}
	                  className="h-7 w-7 object-contain"
	                  loading="lazy"
	                  decoding="async"
	                />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
