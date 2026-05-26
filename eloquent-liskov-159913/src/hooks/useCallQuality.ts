/**
 * useCallQuality — Monitor WebRTC connection quality stats
 */
import { useState, useEffect, useRef, type RefObject } from "react";

export interface CallQualityStats {
  bitrate: number;
  packetLoss: number;
  jitter: number;
  roundTripTime: number;
  quality: "excellent" | "good" | "fair" | "poor";
}

function getQuality(packetLoss: number, rtt: number): CallQualityStats["quality"] {
  if (packetLoss < 1 && rtt < 100) return "excellent";
  if (packetLoss < 3 && rtt < 200) return "good";
  if (packetLoss < 8 && rtt < 400) return "fair";
  return "poor";
}

export function useCallQuality(pcRef: RefObject<RTCPeerConnection | null>) {
  const [stats, setStats] = useState<CallQualityStats>({
    bitrate: 0, packetLoss: 0, jitter: 0, roundTripTime: 0, quality: "good",
  });
  const prevBytes = useRef(0);
  const prevTimestamp = useRef(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      const pc = pcRef.current;
      if (!pc) return;

      try {
        const report = await pc.getStats();
        let totalPacketsLost = 0;
        let totalPacketsReceived = 0;
        let currentJitter = 0;
        let currentRtt = 0;
        let bytesReceived = 0;
        let timestamp = 0;

        report.forEach((stat: any) => {
          if (stat.type === "inbound-rtp" && stat.kind === "audio") {
            totalPacketsLost = stat.packetsLost || 0;
            totalPacketsReceived = stat.packetsReceived || 0;
            currentJitter = (stat.jitter || 0) * 1000;
            bytesReceived = stat.bytesReceived || 0;
            timestamp = stat.timestamp;
          }
          if (stat.type === "candidate-pair" && stat.state === "succeeded") {
            currentRtt = stat.currentRoundTripTime ? stat.currentRoundTripTime * 1000 : 0;
          }
        });

        const totalPackets = totalPacketsLost + totalPacketsReceived;
        const packetLoss = totalPackets > 0 ? (totalPacketsLost / totalPackets) * 100 : 0;

        let bitrate = 0;
        if (prevBytes.current > 0 && prevTimestamp.current > 0) {
          const timeDiff = (timestamp - prevTimestamp.current) / 1000;
          if (timeDiff > 0) {
            bitrate = ((bytesReceived - prevBytes.current) * 8) / timeDiff / 1000;
          }
        }
        prevBytes.current = bytesReceived;
        prevTimestamp.current = timestamp;

        setStats({
          bitrate: Math.round(bitrate),
          packetLoss: Math.round(packetLoss * 10) / 10,
          jitter: Math.round(currentJitter),
          roundTripTime: Math.round(currentRtt),
          quality: getQuality(packetLoss, currentRtt),
        });
      } catch {
        // Stats unavailable
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pcRef]);

  return stats;
}