/**
 * richText — Telegram/WhatsApp-style inline message formatting.
 *
 * Markers (in-band, stored in the plain-text `message` column):
 *   **bold**      _italic_      ~~strike~~      `code`      ||spoiler||
 *
 * Inline code is literal: its contents are NOT re-parsed. Everything else
 * may nest (e.g. **bold _italic_**). Markers only fire at word boundaries so
 * `snake_case`, `2*3*4` and URLs survive untouched.
 *
 * This module is pure (no React) so it can be unit-tested and reused by
 * non-UI callers (push notifications, plain-text previews).
 */

export type RichMark = "bold" | "italic" | "strike" | "code" | "spoiler";

export type RichNode =
  | { type: "text"; value: string }
  | { type: "mark"; mark: RichMark; children: RichNode[] };

export type RichFormat = RichMark;

interface MarkerDef {
  mark: Exclude<RichMark, "code">;
  token: string;
}

// Order matters: multi-char tokens are tried before single-char ones so `~~`
// wins over a stray `~`. `code` is handled separately (literal contents).
const MARKERS: MarkerDef[] = [
  { mark: "bold", token: "**" },
  { mark: "strike", token: "~~" },
  { mark: "spoiler", token: "||" },
  { mark: "italic", token: "_" },
];

const CODE_TOKEN = "`";

/** A char that may sit immediately outside a marker (open: before / close: after). */
function isBoundaryChar(ch: string | undefined): boolean {
  // start/end of string, whitespace, or common punctuation
  return ch === undefined || /[\s.,!?;:()[\]{}'"]/.test(ch);
}

/**
 * An opening marker is valid only at a boundary on its left and with a
 * non-space immediately to its right (so `_ x` or `a_b` don't open).
 */
function canOpen(text: string, pos: number, token: string): boolean {
  const before = pos > 0 ? text[pos - 1] : undefined;
  const after = text[pos + token.length];
  if (!isBoundaryChar(before)) return false;
  if (after === undefined || /\s/.test(after)) return false;
  return true;
}

/**
 * A closing marker is valid only with a non-space immediately to its left and
 * a boundary on its right.
 */
function canClose(text: string, pos: number, token: string): boolean {
  const before = pos > 0 ? text[pos - 1] : undefined;
  const after = text[pos + token.length];
  if (before === undefined || /\s/.test(before)) return false;
  if (!isBoundaryChar(after)) return false;
  return true;
}

function matchTokenAt(text: string, pos: number): MarkerDef | null {
  for (const def of MARKERS) {
    if (text.startsWith(def.token, pos)) return def;
  }
  return null;
}

/**
 * Parse `text` into a tree of rich nodes. Unmatched markers are emitted as
 * plain text, so the function never throws and always round-trips the input.
 */
export function parseRichText(text: string): RichNode[] {
  return parseSegment(text, 0, text.length, null);
}

function parseSegment(
  text: string,
  start: number,
  end: number,
  // token that, when found as a valid close, ends the current segment
  closeToken: string | null,
): RichNode[] {
  const out: RichNode[] = [];
  let buf = "";
  let i = start;

  const flush = () => {
    if (buf) {
      out.push({ type: "text", value: buf });
      buf = "";
    }
  };

  while (i < end) {
    // Inline code — literal contents, highest precedence.
    if (text.startsWith(CODE_TOKEN, i) && canOpen(text, i, CODE_TOKEN)) {
      const contentStart = i + CODE_TOKEN.length;
      const close = findCodeClose(text, contentStart, end);
      if (close !== -1) {
        flush();
        out.push({
          type: "mark",
          mark: "code",
          children: [{ type: "text", value: text.slice(contentStart, close) }],
        });
        i = close + CODE_TOKEN.length;
        continue;
      }
    }

    const def = matchTokenAt(text, i);
    if (def) {
      // Does this token close the current segment?
      if (closeToken && text.startsWith(closeToken, i) && canClose(text, i, closeToken)) {
        // handled by caller — stop here
        break;
      }
      // Try to open a new marked span: find its matching close.
      if (canOpen(text, i, def.token)) {
        const contentStart = i + def.token.length;
        const close = findClose(text, contentStart, end, def.token);
        if (close !== -1) {
          flush();
          out.push({
            type: "mark",
            mark: def.mark,
            children: parseSegment(text, contentStart, close, def.token),
          });
          i = close + def.token.length;
          continue;
        }
      }
    }

    buf += text[i];
    i += 1;
  }

  flush();
  return out;
}

/** Find the matching close for `token` between `from` and `end`. */
function findClose(text: string, from: number, end: number, token: string): number {
  let i = from;
  while (i < end) {
    // Skip over nested inline-code so a backtick'd token isn't treated as a close.
    if (text.startsWith(CODE_TOKEN, i) && canOpen(text, i, CODE_TOKEN)) {
      const codeClose = findCodeClose(text, i + CODE_TOKEN.length, end);
      if (codeClose !== -1) {
        i = codeClose + CODE_TOKEN.length;
        continue;
      }
    }
    if (text.startsWith(token, i) && canClose(text, i, token)) return i;
    i += 1;
  }
  return -1;
}

function findCodeClose(text: string, from: number, end: number): number {
  for (let i = from; i < end; i += 1) {
    if (text.startsWith(CODE_TOKEN, i) && canClose(text, i, CODE_TOKEN)) return i;
  }
  return -1;
}

const TOKEN_FOR: Record<RichFormat, string> = {
  bold: "**",
  italic: "_",
  strike: "~~",
  code: "`",
  spoiler: "||",
};

export interface ApplyFormatResult {
  text: string;
  selStart: number;
  selEnd: number;
}

/**
 * Wrap the `[selStart, selEnd)` selection of `text` in the marker for
 * `format` — or unwrap it if it is already wrapped. With an empty selection,
 * inserts a paired marker and places the caret between the two halves.
 */
export function applyFormat(
  text: string,
  selStart: number,
  selEnd: number,
  format: RichFormat,
): ApplyFormatResult {
  const token = TOKEN_FOR[format];
  const a = Math.max(0, Math.min(selStart, selEnd));
  const b = Math.min(text.length, Math.max(selStart, selEnd));
  const selected = text.slice(a, b);

  // Already wrapped just inside the selection? -> unwrap.
  if (
    selected.startsWith(token) &&
    selected.endsWith(token) &&
    selected.length >= token.length * 2
  ) {
    const inner = selected.slice(token.length, selected.length - token.length);
    const next = text.slice(0, a) + inner + text.slice(b);
    return { text: next, selStart: a, selEnd: a + inner.length };
  }

  // Already wrapped just outside the selection? -> unwrap.
  const before = text.slice(Math.max(0, a - token.length), a);
  const after = text.slice(b, b + token.length);
  if (before === token && after === token) {
    const next = text.slice(0, a - token.length) + selected + text.slice(b + token.length);
    return { text: next, selStart: a - token.length, selEnd: b - token.length };
  }

  // Wrap.
  const next = text.slice(0, a) + token + selected + token + text.slice(b);
  if (a === b) {
    // Empty selection: caret goes between the markers.
    const caret = a + token.length;
    return { text: next, selStart: caret, selEnd: caret };
  }
  return { text: next, selStart: a + token.length, selEnd: b + token.length };
}

/** Render a node tree back to plain text with all markers removed. */
function nodesToPlain(nodes: RichNode[]): string {
  let s = "";
  for (const n of nodes) {
    s += n.type === "text" ? n.value : nodesToPlain(n.children);
  }
  return s;
}

/**
 * Strip all formatting markers, returning clean plain text. For push
 * notifications and any non-React preview surface.
 */
export function stripRichText(text: string): string {
  if (!hasRichMarkers(text)) return text;
  return nodesToPlain(parseRichText(text));
}

/** Cheap pre-check: does the string contain any marker char at all? */
export function hasRichMarkers(text: string): boolean {
  return /[*_~`]|\|\|/.test(text);
}
