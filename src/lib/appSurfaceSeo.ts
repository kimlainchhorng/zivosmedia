import { buildNativeAppUrl } from "@/lib/deepLinks";

const SITE_URL = "https://zivollc.com";

type SurfaceKind = "home" | "feed" | "reels" | "chat" | "profile";

const surfacePaths: Record<SurfaceKind, string> = {
  home: "/app/home",
  feed: "/feed",
  reels: "/reels",
  chat: "/chat",
  profile: "/profile",
};

const surfaceNames: Record<SurfaceKind, string> = {
  home: "ZIVO",
  feed: "ZIVO Feed",
  reels: "ZIVO Reels",
  chat: "ZIVO Chat",
  profile: "ZIVO Profile",
};

export function getAppSurfaceSeo(kind: SurfaceKind) {
  const path = surfacePaths[kind];
  const url = `${SITE_URL}${path === "/app/home" ? "/" : path}`;

  return {
    canonical: kind === "home" ? "/" : path,
    appLink: buildNativeAppUrl(path),
    structuredData: {
      "@context": "https://schema.org",
      "@type": kind === "feed" || kind === "reels" ? "CollectionPage" : "MobileApplication",
      name: surfaceNames[kind],
      url,
      isPartOf: {
        "@type": "WebSite",
        name: "ZIVO",
        url: SITE_URL,
      },
      potentialAction: {
        "@type": "ViewAction",
        target: url,
      },
    },
  } as const;
}
