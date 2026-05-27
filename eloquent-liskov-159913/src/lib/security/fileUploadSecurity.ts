/**
 * Client-side file upload validation.
 * Defence-in-depth layer — server-side validation in fileUpload.ts is authoritative.
 * Running these checks client-side gives instant UX feedback before the network call.
 */

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.com', '.msi', '.sh', '.bash',
  '.ps1', '.vbs', '.hta', '.jar', '.php', '.asp', '.aspx', '.jsp',
  '.py', '.rb', '.pl', '.ts', '.js', '.mjs', '.elf', '.app', '.bin',
]);

const ALLOWED_MIME: Record<string, string[]> = {
  image:    ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf', 'text/plain', 'text/csv'],
  audio:    ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'],
  video:    ['video/mp4', 'video/webm', 'video/ogg'],
  avatar:   ['image/jpeg', 'image/png', 'image/webp'],
};

export type FileCategory = keyof typeof ALLOWED_MIME;

const MAX_SIZES_MB: Record<FileCategory, number> = {
  image:    5,
  document: 15,
  audio:    25,
  video:    100,
  avatar:   2,
};

export interface FileValidationResult {
  ok: boolean;
  error?: string;
}

export function validateFileClient(file: File, category: FileCategory): FileValidationResult {
  // Extension
  const name = file.name.toLowerCase();
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { ok: false, error: `File type "${ext}" is not allowed.` };
  }

  // MIME type
  const allowed = ALLOWED_MIME[category] ?? [];
  if (file.type && !allowed.includes(file.type)) {
    return { ok: false, error: `${category} uploads must be: ${allowed.join(', ')}.` };
  }

  // File size
  const maxBytes = MAX_SIZES_MB[category] * 1024 * 1024;
  if (file.size > maxBytes) {
    return { ok: false, error: `File is too large. Maximum is ${MAX_SIZES_MB[category]} MB.` };
  }

  // Zero-byte file
  if (file.size === 0) {
    return { ok: false, error: 'File is empty.' };
  }

  return { ok: true };
}

/**
 * Read the first N bytes of a File for magic-byte sniffing.
 */
export async function readFileHeader(file: File, bytes = 12): Promise<Uint8Array> {
  const slice = file.slice(0, bytes);
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
}

const MAGIC: Array<{ mime: string; sig: number[]; offset?: number }> = [
  { mime: 'image/jpeg',      sig: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',       sig: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif',       sig: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp',      sig: [0x52, 0x49, 0x46, 0x46] },
  { mime: 'application/pdf', sig: [0x25, 0x50, 0x44, 0x46] },
];

export function verifyMagicBytes(header: Uint8Array, declaredMime: string): boolean {
  const sig = MAGIC.find(m => m.mime === declaredMime);
  if (!sig) return true; // no entry — skip
  const off = sig.offset ?? 0;
  return sig.sig.every((b, i) => header[off + i] === b);
}
