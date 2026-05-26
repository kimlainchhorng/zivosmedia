/**
 * File upload security: validates MIME type, magic bytes, extension, and file size.
 * Use before writing any file to Supabase Storage.
 *
 * Usage:
 *   const check = await validateUpload(file, 'image');
 *   if (!check.ok) return err(req, check.reason, 400);
 */

// ── Allowlists ─────────────────────────────────────────────────────────────────
const ALLOWED = {
  image:    ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf', 'text/plain', 'text/csv'],
  audio:    ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'],
  video:    ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  any:      ['image/jpeg','image/png','image/webp','image/gif',
             'application/pdf','text/plain',
             'audio/mpeg','audio/ogg','audio/wav','audio/webm',
             'video/mp4','video/webm','video/ogg'],
} as const;

export type UploadCategory = keyof typeof ALLOWED;

// ── Max file sizes per category (bytes) ───────────────────────────────────────
const MAX_SIZES: Record<UploadCategory, number> = {
  image:    5  * 1024 * 1024,   // 5 MB
  document: 15 * 1024 * 1024,   // 15 MB
  audio:    25 * 1024 * 1024,   // 25 MB
  video:    100 * 1024 * 1024,  // 100 MB
  any:      25 * 1024 * 1024,   // 25 MB
};

// ── Magic byte signatures (first N bytes of file) ─────────────────────────────
const SIGNATURES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: 'image/jpeg',       bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',        bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { mime: 'image/gif',        bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp',       bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF
  { mime: 'application/pdf',  bytes: [0x25, 0x50, 0x44, 0x46] },           // %PDF
  { mime: 'audio/mpeg',       bytes: [0xFF, 0xFB] },
  { mime: 'audio/mpeg',       bytes: [0x49, 0x44, 0x33] },                 // ID3
  { mime: 'video/mp4',        bytes: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70] }, // ftyp
];

// Dangerous file extensions — never allow regardless of MIME type
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.com', '.msi', '.sh', '.bash', '.zsh', '.fish',
  '.ps1', '.psm1', '.psd1', '.vbs', '.vbe', '.wsf', '.wsh', '.hta', '.jar',
  '.php', '.php3', '.php4', '.php5', '.phtml', '.asp', '.aspx', '.jsp',
  '.py', '.rb', '.pl', '.lua', '.go', '.rs', '.ts', '.js', '.mjs', '.cjs',
  '.elf', '.out', '.bin', '.run', '.app',
]);

export interface UploadValidation {
  ok: boolean;
  reason?: string;
}

function checkMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  const sig = SIGNATURES.find(s => s.mime === mimeType);
  if (!sig) return true; // no signature registered — allow (MIME header is still checked)
  const offset = sig.offset ?? 0;
  return sig.bytes.every((b, i) => bytes[offset + i] === b);
}

/**
 * Validate a file before upload.
 * @param file       - File object (browser) or { name, type, size, arrayBuffer }
 * @param category   - Expected upload category
 * @param fileBytes  - Optional raw bytes for magic-byte validation
 */
export async function validateUpload(
  name: string,
  declaredMime: string,
  size: number,
  category: UploadCategory,
  fileBytes?: Uint8Array,
): Promise<UploadValidation> {
  // 1. Extension check
  const ext = (name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '');
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { ok: false, reason: `File extension "${ext}" is not allowed` };
  }

  // 2. File size
  if (size > MAX_SIZES[category]) {
    const maxMb = (MAX_SIZES[category] / 1024 / 1024).toFixed(0);
    return { ok: false, reason: `File exceeds maximum size of ${maxMb} MB` };
  }

  // 3. MIME type allowlist
  const allowed = ALLOWED[category] as readonly string[];
  if (!allowed.includes(declaredMime)) {
    return { ok: false, reason: `File type "${declaredMime}" is not allowed for ${category} uploads` };
  }

  // 4. Magic byte validation (prevents MIME type spoofing)
  if (fileBytes && fileBytes.length >= 8) {
    const magicOk = checkMagicBytes(fileBytes, declaredMime);
    if (!magicOk) {
      return { ok: false, reason: 'File content does not match declared type (possible spoofing)' };
    }

    // Extra: reject files with embedded script tags in the first 4 KB
    const preview = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes.slice(0, 4096));
    if (/<script\b|javascript:|onerror\s*=/i.test(preview)) {
      return { ok: false, reason: 'File contains potentially dangerous embedded content' };
    }
  }

  return { ok: true };
}
