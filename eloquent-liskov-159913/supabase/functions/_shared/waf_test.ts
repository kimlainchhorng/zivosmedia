import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { inspectRequest, clientIp } from './waf.ts';

Deno.test('waf allows clean GET', async () => {
  const r = await inspectRequest(new Request('https://x.test/api/products?page=1'));
  assert(r.ok);
});

Deno.test('waf blocks SQL injection in query', async () => {
  const r = await inspectRequest(new Request("https://x.test/api/users?id=1' OR 1=1 --"));
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.reason, 'sqli');
});

Deno.test('waf blocks XSS payload in body', async () => {
  const r = await inspectRequest(
    new Request('https://x.test/api/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ msg: '<script>alert(1)</script>' }),
    }),
  );
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.reason, 'xss');
});

Deno.test('waf blocks path traversal', async () => {
  const r = await inspectRequest(new Request('https://x.test/files?p=../../../../etc/passwd'));
  assertEquals(r.ok, false);
});

Deno.test('waf blocks oversize payload via header', async () => {
  const r = await inspectRequest(
    new Request('https://x.test/api/upload', {
      method: 'POST',
      headers: { 'content-length': String(2 * 1024 * 1024), 'content-type': 'application/json' },
      body: '{}',
    }),
  );
  assertEquals(r.ok, false);
});

Deno.test('clientIp parses x-forwarded-for', () => {
  const ip = clientIp(new Request('https://x.test/', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } }));
  assertEquals(ip, '1.2.3.4');
});
