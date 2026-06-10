/**
 * Shared media-type detection for store assets (cover banners, logos).
 *
 * A banner_url is just a string column — it can point at either an image or a
 * video. The editor and the public store page must agree on which it is so they
 * render the right element (<img> vs <video>). Detection is extension-based to
 * avoid a schema migration / extra media-type column.
 */

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v", "ogv"] as const;

const VIDEO_URL_RE = new RegExp(`\\.(${VIDEO_EXTENSIONS.join("|")})($|\\?|#)`, "i");

/** True when the URL points at a video file we render with <video>. */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return VIDEO_URL_RE.test(url.trim());
}

/** Accept attribute for inputs that allow either an image or a cover video. */
export const IMAGE_OR_VIDEO_ACCEPT = "image/*,video/*";
