import { describe, expect, it } from "vitest";
import { classifyWebRTCFailure } from "@/hooks/useWebRTC";

describe("classifyWebRTCFailure", () => {
  it("maps permission errors for video calls", () => {
    const failure = classifyWebRTCFailure(new DOMException("Denied", "NotAllowedError"), "video");

    expect(failure.code).toBe("permissions");
    expect(failure.title).toBe("Permission required");
    expect(failure.description).toContain("camera and microphone");
  });

  it("maps missing input devices for voice calls", () => {
    const failure = classifyWebRTCFailure(new DOMException("Missing", "NotFoundError"), "voice");

    expect(failure.code).toBe("devices_unavailable");
    expect(failure.description).toContain("microphone");
  });

  it("maps busy hardware errors", () => {
    const failure = classifyWebRTCFailure(new DOMException("Busy", "NotReadableError"), "video");

    expect(failure.code).toBe("device_busy");
    expect(failure.description).toContain("Another app may already be using");
  });

  it("maps negotiation and timeout style errors to connection failures", () => {
    const failure = classifyWebRTCFailure(new DOMException("Timed out", "NetworkError"), "voice");

    expect(failure.code).toBe("connection");
    expect(failure.title).toBe("Connection problem");
  });
});