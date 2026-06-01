export const HASHTAG_RE = /#([\p{L}\p{N}_]{2,30})/gu;

export function postHasHashtag(caption: string | null | undefined, tag: string): boolean {
  if (!caption) return false;
  const re = new RegExp(`#${tag.replace(/[^\p{L}\p{N}_]/gu, "\\$&")}\\b`, "iu");
  return re.test(caption);
}
