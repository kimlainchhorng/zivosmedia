import { supabase } from "@/integrations/supabase/client";

export type SharedOriginInfo = {
  name: string;
  avatar: string;
  caption: string;
  source: "user" | "store";
  userId: string | null;
  storeSlug: string | null;
};

type SourceUserPost = {
  id: string;
  user_id: string;
  caption: string | null;
};

type SourceStorePost = {
  id: string;
  store_id: string;
  caption: string | null;
};

type BasicProfile = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type StoreProfile = {
  id: string;
  name: string | null;
  logo_url: string | null;
  slug: string | null;
};

export async function resolveSharedOrigins(params: {
  sharedPostIds: string[];
  sharedUserIds?: string[];
}) {
  const uniqueSharedPostIds = [...new Set(params.sharedPostIds.filter(Boolean))];
  const uniqueSharedUserIds = [...new Set((params.sharedUserIds ?? []).filter(Boolean))];

  const originByPostId: Record<string, SharedOriginInfo> = {};
  const originByUserId: Record<string, SharedOriginInfo> = {};

  if (!uniqueSharedPostIds.length && !uniqueSharedUserIds.length) {
    return { originByPostId, originByUserId };
  }

  let sourceUserPosts: SourceUserPost[] = [];
  let sourceStorePosts: SourceStorePost[] = [];

  if (uniqueSharedPostIds.length) {
    const [{ data: userPosts }, { data: storePosts }] = await Promise.all([
      (supabase as any)
        .from("user_posts")
        .select("id, user_id, caption")
        .in("id", uniqueSharedPostIds),
      supabase
        .from("store_posts")
        .select("id, store_id, caption")
        .in("id", uniqueSharedPostIds),
    ]);

    sourceUserPosts = (userPosts ?? []) as SourceUserPost[];
    sourceStorePosts = (storePosts ?? []) as SourceStorePost[];
  }

  const profileIds = [
    ...new Set([
      ...uniqueSharedUserIds,
      ...sourceUserPosts.map((post) => post.user_id),
    ]),
  ];
  const storeIds = [...new Set(sourceStorePosts.map((post) => post.store_id))];

  const [profiles, storeProfiles] = await Promise.all([
    profileIds.length
      ? supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", profileIds)
          .then(({ data }) => (data ?? []) as BasicProfile[])
      : Promise.resolve([] as BasicProfile[]),
    storeIds.length
      ? supabase
          .from("store_profiles")
          .select("id, name, logo_url, slug")
          .in("id", storeIds)
          .then(({ data }) => (data ?? []) as StoreProfile[])
      : Promise.resolve([] as StoreProfile[]),
  ]);

  const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const storeMap = new Map(storeProfiles.map((store) => [store.id, store]));

  for (const storePost of sourceStorePosts) {
    const store = storeMap.get(storePost.store_id);
    originByPostId[storePost.id] = {
      name: store?.name?.trim() || "Store",
      avatar: store?.logo_url || "",
      caption: storePost.caption || "",
      source: "store",
      userId: null,
      storeSlug: store?.slug || null,
    };
  }

  for (const userPost of sourceUserPosts) {
    if (originByPostId[userPost.id]) continue;

    const profile = profileMap.get(userPost.user_id);
    originByPostId[userPost.id] = {
      name: profile?.full_name?.trim() || "Someone",
      avatar: profile?.avatar_url || "",
      caption: userPost.caption || "",
      source: "user",
      userId: userPost.user_id,
      storeSlug: null,
    };
  }

  for (const userId of uniqueSharedUserIds) {
    const profile = profileMap.get(userId);
    originByUserId[userId] = {
      name: profile?.full_name?.trim() || "Someone",
      avatar: profile?.avatar_url || "",
      caption: "",
      source: "user",
      userId,
      storeSlug: null,
    };
  }

  return { originByPostId, originByUserId };
}