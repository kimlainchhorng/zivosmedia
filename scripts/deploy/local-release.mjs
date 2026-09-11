#!/usr/bin/env node
/** Use existing local CLI authentication without copying tokens into source or env files. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));

const mode = process.argv[2];
if (!['--check', '--deploy'].includes(mode) || process.argv.length !== 3) {
  console.error('Usage: node scripts/deploy/local-release.mjs --check|--deploy');
  process.exit(2);
}
const env = { ...process.env };
if (!env.SUPABASE_ACCESS_TOKEN && process.platform === 'darwin') {
  // These are the Supabase CLI native credential accounts, not a broad keychain scan.
  for (const account of ['access-token', 'supabase']) {
    const result = spawnSync('/usr/bin/security', ['find-generic-password', '-s', 'Supabase CLI', '-a', account, '-w'], { encoding: 'utf8' });
    if (result.status !== 0) continue;
    let token = result.stdout.trim();
    const prefix = 'go-keyring-base64:';
    if (token.startsWith(prefix)) token = Buffer.from(token.slice(prefix.length), 'base64').toString('utf8');
    if (/^sbp_(?:oauth_|v0_)?[a-f0-9]{40}$/.test(token)) { env.SUPABASE_ACCESS_TOKEN = token; break; }
  }
}
if (!env.SUPABASE_ACCESS_TOKEN) {
  console.error('Release requires Supabase CLI authentication. Run supabase login or securely configure SUPABASE_ACCESS_TOKEN. No token values are printed.');
  process.exit(2);
}
function run(args) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd: root, env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (mode === '--deploy') {
  // Preserve the canonical strict preflight, release gate and fresh build.
  run(['run', 'cloudflare:deploy']);
} else {
  run(['run', 'deploy:preflight:strict', '--', '--skip-build', '--skip-type-check']);
  run(['run', 'release:production-gate']);
}
