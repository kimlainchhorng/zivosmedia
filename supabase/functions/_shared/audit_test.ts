import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { redactPii } from './audit.ts';

Deno.test('redactPii removes emails, phones, cards', () => {
  const out = redactPii({
    note: 'Reach me at john.doe@example.com or +1 555 123 4567',
    card: '4242 4242 4242 4242',
  });
  assert(!JSON.stringify(out).includes('john.doe@example.com'));
  assert(!JSON.stringify(out).includes('4242 4242 4242 4242'));
  assert(!JSON.stringify(out).includes('555 123 4567'));
});

Deno.test('redactPii redacts secret-like keys regardless of value', () => {
  const out = redactPii({ password: 'hunter2', api_key: 'sk_live_xyz', authorization: 'Bearer abc' });
  assertEquals((out as any).password, '[redacted]');
  assertEquals((out as any).api_key, '[redacted]');
  assertEquals((out as any).authorization, '[redacted]');
});
