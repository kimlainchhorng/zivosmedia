import type { RealtimeClient } from '@supabase/supabase-js';
import type { Socket } from '@supabase/phoenix';
import { routeNeedsRealtime } from './routePolicy';

// Keep the installed SDK adapter dependency isolated and covered by transport tests.
export function realtimeSocket(client: RealtimeClient): Socket {
  return (client as unknown as { socketAdapter: { getSocket(): Socket } }).socketAdapter.getSocket();
}
export type LiveUpdateState = 'idle' | 'connected' | 'retrying' | 'unavailable';
export const MAX_REALTIME_FAILURES = 5;
export const realtimeBackoff = (failures: number) => Math.min(30_000, 1_000 * 2 ** Math.max(0, failures - 1));
let routeActive = typeof window === 'undefined' || routeNeedsRealtime(window.location.pathname);
const listeners = new Set<() => void>();
const circuits = new Set<{ state: LiveUpdateState; retry: () => void; activate: (active:boolean) => void }>();
export function liveUpdateSnapshot(): LiveUpdateState {
  const states = [...circuits].map(c => c.state);
  return states.includes('unavailable') ? 'unavailable' : states.includes('retrying') ? 'retrying' : states.includes('connected') ? 'connected' : 'idle';
}
export function subscribeLiveUpdates(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function retryLiveUpdates() { circuits.forEach(c => c.retry()); }
export function setRealtimeRouteActive(active:boolean) {
  if (routeActive === active) return;
  routeActive = active;
  circuits.forEach(c => c.activate(active));
}
const installed = new WeakSet<RealtimeClient>();

/** One circuit per client; route changes never reset the failure budget. */
export function installRealtimeCircuit(client: RealtimeClient) {
  if (installed.has(client)) return;
  installed.add(client);
  const socket = realtimeSocket(client);
  const connect = socket.connect.bind(socket);
  const disconnect = client.disconnect.bind(client);
  let intentionalDisconnect = false, failedAttempt = false;
  let failures = 0, nextAttemptAt = 0;
  let stopping: Promise<unknown> = Promise.resolve();
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  const hasChannels = () => client.getChannels().length > 0;
  function clearRetry() { clearTimeout(retryTimer); retryTimer = undefined; socket.reconnectTimer.reset(); }
  function setState(state: LiveUpdateState) {
    if (circuit.state === state) return;
    circuit.state = state; listeners.forEach(listener => listener());
  }
  function scheduleRetry() {
    if (retryTimer || !routeActive || !hasChannels() || failures >= MAX_REALTIME_FAILURES) return;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void stopping.then(() => {
        if (routeActive && hasChannels() && failures < MAX_REALTIME_FAILURES) client.connect();
      });
    }, Math.max(1, nextAttemptAt - Date.now()));
  }
  function stopTransport() {
    intentionalDisconnect = true;
    stopping = disconnect();
  }
  const circuit = {
    state: 'idle' as LiveUpdateState,
    retry: () => {
      if (!routeActive || !hasChannels() || !['unavailable','retrying'].includes(circuit.state)) return;
      failures = 0; nextAttemptAt = 0; failedAttempt = false;
      clearRetry(); setState('retrying'); scheduleRetry();
    },
    activate: (active:boolean) => {
      clearRetry();
      if (!active) { stopTransport(); setState('idle'); return; }
      if (!hasChannels()) return;
      setState(failures >= MAX_REALTIME_FAILURES ? 'unavailable' : 'retrying');
      scheduleRetry();
    },
  };
  function failed() {
    if (intentionalDisconnect || failedAttempt || !routeActive) return;
    failedAttempt = true;
    failures++;
    nextAttemptAt = Date.now() + realtimeBackoff(failures);
    clearRetry();
    setState(failures >= MAX_REALTIME_FAILURES ? 'unavailable' : 'retrying');
    stopTransport();
    scheduleRetry();
  }
  circuits.add(circuit);
  client.disconnect = (...args) => {
    intentionalDisconnect = true;
    clearRetry(); setState('idle');
    stopping = disconnect(...args);
    return stopping as ReturnType<RealtimeClient['disconnect']>;
  };
  socket.reconnectAfterMs = () => realtimeBackoff(failures || 1);
  socket.connect = (...args) => {
    if (!routeActive || !hasChannels()) return;
    if (failures >= MAX_REALTIME_FAILURES) { setState('unavailable'); return; }
    // A timer may fire before the deadline. Reschedule instead of dropping the retry.
    if (Date.now() < nextAttemptAt) { scheduleRetry(); return; }
    if (!socket.isConnected() && socket.connectionState() !== 'connecting') {
      failedAttempt = false; intentionalDisconnect = false;
    }
    connect(...args);
  };
  socket.onError(failed);
  socket.onClose(() => {
    if (!intentionalDisconnect) failed();
    socket.reconnectTimer.reset();
  });
  socket.onOpen(() => {
    clearRetry(); nextAttemptAt = 0;
    if (!routeActive) { stopTransport(); setState('idle'); } else setState('connected');
  });
  socket.onMessage(message => {
    if (message.event === 'phx_reply' && typeof message.payload === 'object' && message.payload !== null && 'status' in message.payload && message.payload.status === 'ok') {
      failures = 0; failedAttempt = false;
      if (routeActive && hasChannels()) setState('connected');
    }
  });
}
