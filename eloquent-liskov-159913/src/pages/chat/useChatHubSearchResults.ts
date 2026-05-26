import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SearchFilter = "chats" | "media" | "links" | "files";
type ActiveCategory = "personal" | "shop" | "support" | "ride";

type DetectPreviewType = (message: string) => { hasMedia: boolean; hasLink: boolean; hasFile: boolean };
type ParsePreview = (message: string) => string;

export function useChatHubSearchResults({
  active,
  search,
  searchFilter,
  sortedVisible,
  userId,
  parseRichMessagePreview,
  detectPreviewType,
}: {
  active: ActiveCategory;
  search: string;
  searchFilter: SearchFilter;
  sortedVisible: any[];
  userId: string | undefined;
  parseRichMessagePreview: ParsePreview;
  detectPreviewType: DetectPreviewType;
}) {
  const [profileResults, setProfileResults] = useState<any[]>([]);
  const [searchingProfiles, setSearchingProfiles] = useState(false);

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedSearch) return sortedVisible;

    return sortedVisible.filter((chat: any) => {
      const preview = parseRichMessagePreview(chat.lastMessage || "");
      const searchable = `${String(chat.name || "")} ${String(preview || "")}`.toLowerCase();
      if (!searchable.includes(normalizedSearch)) return false;

      const type = detectPreviewType(preview);
      if (searchFilter === "media") return type.hasMedia;
      if (searchFilter === "links") return type.hasLink;
      if (searchFilter === "files") return type.hasFile;
      return true;
    });
  }, [detectPreviewType, normalizedSearch, parseRichMessagePreview, searchFilter, sortedVisible]);

  useEffect(() => {
    if (active !== "personal" || search.trim().length < 2 || !userId) {
      setProfileResults([]);
      setSearchingProfiles(false);
      return;
    }

    let alive = true;
    const timeout = setTimeout(async () => {
      setSearchingProfiles(true);
      try {
        const term = `%${search.trim()}%`;
        const { data } = await (supabase as any)
          .from("profiles")
          .select("user_id, full_name, avatar_url, email, is_verified")
          .or(`full_name.ilike.${term},email.ilike.${term}`)
          .neq("user_id", userId)
          .eq("is_of_creator", false)
          .limit(15);

        if (alive && data) {
          setProfileResults(
            data.map((profile: any) => ({
              id: profile.user_id,
              name: profile.full_name || profile.email || "User",
              avatar: profile.avatar_url,
              isVerified: profile.is_verified === true,
              lastMessage: "Tap to chat",
              lastTime: new Date().toISOString(),
              unread: 0,
            }))
          );
        }
      } catch {
        if (alive) setProfileResults([]);
      } finally {
        if (alive) setSearchingProfiles(false);
      }
    }, 350);

    return () => {
      alive = false;
      clearTimeout(timeout);
    };
  }, [active, search, userId]);

  const displayList = useMemo(() => {
    if (!(active === "personal" && searchFilter === "chats" && search.trim().length >= 2)) {
      return filtered;
    }

    return [
      ...filtered,
      ...profileResults.filter((profile) => !filtered.some((chat: any) => chat.id === profile.id)),
    ];
  }, [active, filtered, profileResults, search, searchFilter]);

  return {
    searchingProfiles,
    profileResults,
    filtered,
    displayList,
  };
}
