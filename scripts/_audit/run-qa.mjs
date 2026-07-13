// TEMP: run each QA/contract script independently, capture pass/fail + output tail.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const SCRIPTS = [
  'qa:platform-readiness', 'qa:platform-readiness:check',
  'qa:workflow-coverage', 'qa:workflow-coverage:check',
  'qa:workflow-test-plan', 'qa:workflow-test-plan:check',
  'qa:frontend-visual-contracts', 'qa:native-app-contracts',
  'qa:storage-media-contracts', 'qa:database-storage-contracts',
  'qa:security-anti-abuse-contracts', 'qa:legal-policy-contracts',
  'qa:sso-auth-contracts', 'qa:api-operations-contracts',
  'qa:edge-function-deploy-contracts', 'qa:edge-function-slot-readiness',
  'qa:edge-function-browser-gates', 'qa:email-marketing-contracts',
  'qa:push-notification-contracts', 'qa:ads-monetization-contracts',
  'qa:payouts-earnings-contracts', 'qa:payments-refunds-contracts',
  'qa:customer-booking-contracts', 'qa:shop-owner-contracts',
  'qa:client-staff-contracts', 'qa:safe-area',
  'perf:media-report',
  'security:check-secrets', 'security:check-supabase-token-fragments',
  'security:api-readiness:report',
];

const results = [];
for (const s of SCRIPTS) {
  const t0 = Date.now();
  const r = spawnSync('npm', ['run', '-s', s], { encoding: 'utf8', timeout: 180000, shell: true });
  const out = ((r.stdout || '') + (r.stderr || '')).trim();
  const tail = out.split('\n').slice(-12).join('\n');
  const rec = { script: s, code: r.status, ms: Date.now() - t0, ok: r.status === 0, tail: tail.slice(0, 1400) };
  results.push(rec);
  console.log(`[${rec.ok ? 'PASS' : 'FAIL(' + r.status + ')'}] ${s} (${rec.ms}ms)`);
  fs.writeFileSync('scripts/_audit/qa-results.json', JSON.stringify(results, null, 2));
}
console.log('\nDONE: ' + results.filter(r => r.ok).length + '/' + results.length + ' passed');
