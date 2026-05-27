/**
 * useShareContent — Native share sheet via Web Share API / Capacitor
 */
import { useCallback } from "react";
import { toast } from "sonner";
import { getPublicOrigin, getProfileShareUrl, getPostShareUrl } from "@/lib/getPublicOrigin";

interface ShareOptions {
  title: string;
  text?: string;
  url: string;
}

export function useShareContent() {
  const share = useCallback(async ({ title, text, url }: ShareOptions) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return true;
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("Share failed:", err);
        }
        return false;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
      return true;
    } catch {
      toast.error("Could not share");
      return false;
    }
  }, []);

  const sharePost = useCallback((postId: string, caption?: string) => {
    return share({
      title: caption || "Check out this post on ZIVO",
      text: caption || "See this on ZIVO",
      url: getPostShareUrl(postId),
    });
  }, [share]);

  const shareProfile = useCallback((shareCode: string, name?: string) => {
    return share({
      title: `${name || "User"} on ZIVO`,
      text: `Check out ${name || "this user"}'s profile on ZIVO`,
      url: getProfileShareUrl(shareCode),
    });
  }, [share]);

  const shareFlight = useCallback((origin: string, destination: string) => {
    return share({
      title: `Flight from ${origin} to ${destination}`,
      text: `Check out this flight deal on ZIVO`,
      url: `${getPublicOrigin()}/flights/${origin}-to-${destination}`,
    });
  }, [share]);

  return { share, sharePost, shareProfile, shareFlight };
}
