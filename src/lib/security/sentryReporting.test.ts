import { afterEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn() }));
vi.mock('@sentry/browser', () => sdk);
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks(); });
it('does not initialize or send without an explicitly configured production DSN', async () => {
  vi.stubEnv('PROD', true); vi.stubEnv('VITE_SENTRY_DSN', '');
  await (await import('./sentryReporting')).reportToSentry(new Error('private'), 'global');
  expect(sdk.init).not.toHaveBeenCalled(); expect(sdk.captureException).not.toHaveBeenCalled();
});
it('strips personal information, error text, URL queries and source context before sending', async () => {
  vi.stubEnv('PROD', true); vi.stubEnv('VITE_SENTRY_DSN', 'https://public@example.invalid/1');
  await (await import('./sentryReporting')).reportToSentry(new Error('private'), 'route');
  const config = sdk.init.mock.calls[0][0];
  expect(config).toMatchObject({ defaultIntegrations: false, sendDefaultPii: false, tracesSampleRate: 0 });
  const event = config.beforeSend({ user: { email: 'private' }, request: { url: 'private' }, message:'private', contexts:{private:true}, extra:{private:true}, breadcrumbs:[{message:'private'}], exception:{values:[{ value:'private', stacktrace:{frames:[{filename:'https://zivosmedia.com/assets/app.js?token=private', context_line:'private', vars:{private:true}, lineno:2}]} }]} });
  expect(JSON.stringify(event)).not.toContain('private');
  expect(event.exception.values[0].stacktrace.frames[0].filename).toBe('https://zivosmedia.com/assets/app.js');
});
it('keeps error recovery working if SDK initialization fails', async () => {
  vi.stubEnv('PROD', true); vi.stubEnv('VITE_SENTRY_DSN', 'https://public@example.invalid/1');
  sdk.init.mockImplementationOnce(() => { throw new Error('unavailable'); });
  await expect((await import('./sentryReporting')).reportToSentry(new Error('private'), 'route')).resolves.toBeUndefined();
});
