/**
 * Detect an active @-mention prefix at the caret. Returns the partial query
 * without the "@" if one is being typed, or null otherwise.
 */
export function detectMention(text: string, caret: number): string | null {
  if (caret <= 0 || caret > text.length) return null;
  for (let i = caret - 1; i >= 0 && i >= caret - 30; i--) {
    const c = text[i];
    if (c === "@") {
      if (i === 0 || /\s/.test(text[i - 1])) {
        return text.slice(i + 1, caret);
      }
      return null;
    }
    if (/\s/.test(c)) return null;
  }
  return null;
}

export function applyMention(text: string, caret: number, handle: string): { value: string; caret: number } {
  for (let i = caret - 1; i >= 0 && i >= caret - 30; i--) {
    if (text[i] === "@") {
      const before = text.slice(0, i);
      const after = text.slice(caret);
      const insert = `@${handle} `;
      return { value: before + insert + after, caret: (before + insert).length };
    }
    if (/\s/.test(text[i])) break;
  }
  const next = `${text}@${handle} `;
  return { value: next, caret: next.length };
}
