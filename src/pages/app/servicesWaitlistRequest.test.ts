import { describe, expect, it } from "vitest";
import {
  beginWaitlistRequest,
  completeWaitlistRequest,
  createWaitlistRequestGate,
  invalidateWaitlistRequest,
} from "./servicesWaitlistRequest";

describe("services waitlist request gate", () => {
  it("prevents a second submission while the current request is pending", () => {
    const gate = createWaitlistRequestGate();

    expect(beginWaitlistRequest(gate)).toBe(1);
    expect(beginWaitlistRequest(gate)).toBeNull();
    expect(gate.inFlight).toBe(true);
  });

  it("does not let an older response finish a newer service request", () => {
    const gate = createWaitlistRequestGate();
    const insuranceRequest = beginWaitlistRequest(gate);
    invalidateWaitlistRequest(gate);
    const visaHelpRequest = beginWaitlistRequest(gate);

    expect(insuranceRequest).toBe(1);
    expect(visaHelpRequest).toBe(3);
    expect(completeWaitlistRequest(gate, insuranceRequest!)).toBe(false);
    expect(gate.inFlight).toBe(true);
    expect(completeWaitlistRequest(gate, visaHelpRequest!)).toBe(true);
    expect(gate.inFlight).toBe(false);
  });
});
