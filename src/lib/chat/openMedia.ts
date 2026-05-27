/**
 * Global media-open event — chat pages mount MediaGalleryLightbox and
 * listen for `zivo:open-media`, then any bubble can request fullscreen view
 * without prop-drilling.
 */
export const OPEN_MEDIA_EVENT = "zivo:open-media";

export interface OpenMediaDetail {
  url: string;
  type: "image" | "video";
  id?: string;
  gallery?: { id: string; url: string; type: "image" | "video" }[];
  index?: number;
}

export function openMedia(detail: OpenMediaDetail) {
  window.dispatchEvent(new CustomEvent<OpenMediaDetail>(OPEN_MEDIA_EVENT, { detail }));
}
