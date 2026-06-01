import { supabase } from "@/integrations/supabase/client";

export type PostBookmarkSource = "store" | "user";

export type SavePostBookmarkPayload = {
  post_id: string;
  source: PostBookmarkSource;
  sync_legacy?: boolean;
  legacy_item_id?: string;
  collection_name?: string;
};

export type RemovePostBookmarkPayload = {
  post_bookmark_id?: string;
  post_id?: string;
  source?: PostBookmarkSource;
  sync_legacy?: boolean;
  legacy_item_id?: string;
};

type PostBookmarkManageResult = {
  ok?: boolean;
  bookmark?: unknown;
  error?: string;
};

export async function savePostBookmark(payload: SavePostBookmarkPayload) {
  const { data, error } = await supabase.functions.invoke<PostBookmarkManageResult>("post-bookmark-manage", {
    body: {
      action: "save_post",
      ...payload,
    },
  });

  return { data: data?.bookmark ?? null, error };
}

export async function removePostBookmark(payload: RemovePostBookmarkPayload) {
  const { data, error } = await supabase.functions.invoke<PostBookmarkManageResult>("post-bookmark-manage", {
    body: {
      action: "unsave_post",
      ...payload,
    },
  });

  return { data: data?.bookmark ?? null, error };
}
