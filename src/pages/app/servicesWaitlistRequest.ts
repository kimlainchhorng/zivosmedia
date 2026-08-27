export interface WaitlistRequestGate {
  requestId: number;
  inFlight: boolean;
}

export function createWaitlistRequestGate(): WaitlistRequestGate {
  return { requestId: 0, inFlight: false };
}

export function invalidateWaitlistRequest(gate: WaitlistRequestGate): void {
  gate.requestId += 1;
  gate.inFlight = false;
}

export function beginWaitlistRequest(gate: WaitlistRequestGate): number | null {
  if (gate.inFlight) return null;
  gate.requestId += 1;
  gate.inFlight = true;
  return gate.requestId;
}

export function completeWaitlistRequest(gate: WaitlistRequestGate, requestId: number): boolean {
  if (gate.requestId !== requestId) return false;
  gate.inFlight = false;
  return true;
}
