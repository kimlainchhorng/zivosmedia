// Structured JSON logger with correlation IDs for cross-function tracing.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  correlationId: string;
  route: string;
  userId?: string;
  ip?: string | null;
  method?: string;
}

function emit(level: LogLevel, msg: string, ctx: Partial<LogContext>, extra?: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...ctx,
    ...extra,
  });
  // deno-lint-ignore no-console
  (level === 'error' ? console.error : console.log)(line);
}

export function newCorrelationId(req?: Request): string {
  const incoming = req?.headers.get('x-request-id') ?? req?.headers.get('x-correlation-id');
  if (incoming && /^[a-z0-9-]{8,64}$/i.test(incoming)) return incoming;
  return crypto.randomUUID();
}

export function makeLogger(ctx: LogContext) {
  return {
    correlationId: ctx.correlationId,
    debug: (msg: string, extra?: Record<string, unknown>) => emit('debug', msg, ctx, extra),
    info: (msg: string, extra?: Record<string, unknown>) => emit('info', msg, ctx, extra),
    warn: (msg: string, extra?: Record<string, unknown>) => emit('warn', msg, ctx, extra),
    error: (msg: string, extra?: Record<string, unknown>) => emit('error', msg, ctx, extra),
    child: (overrides: Partial<LogContext>) => makeLogger({ ...ctx, ...overrides }),
  };
}

export type Logger = ReturnType<typeof makeLogger>;
