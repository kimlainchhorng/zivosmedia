export const SOCIAL_ROUTE_PATHS = {
  feed: "/feed",
  reels: "/reels",
  reelDetail: "/reels/:postId",
  chat: "/chat",
  profile: "/profile",
} as const;

export const PUBLIC_SOCIAL_ROUTE_PATHS = [
  SOCIAL_ROUTE_PATHS.feed,
  SOCIAL_ROUTE_PATHS.reels,
  SOCIAL_ROUTE_PATHS.reelDetail,
] as const;

export const AUTH_REQUIRED_SOCIAL_ROUTE_PATHS = [
  SOCIAL_ROUTE_PATHS.chat,
  SOCIAL_ROUTE_PATHS.profile,
] as const;
