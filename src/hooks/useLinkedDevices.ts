/**
 * useLinkedDevices — read and manage the account's registered devices.
 *
 * Registration and removal are server-owned. The registry is useful for
 * device recognition, but it is not a live list of Supabase Auth sessions.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserDevice {
  id: string;
  device_fingerprint: string | null;
  device_label: string | null;
  user_agent: string | null;
  platform: string | null;
  last_seen_at: string;
  created_at: string;
}

const FP_KEY = "zivo_device_fp";
const LINKED_DEVICE_COLUMNS =
  "id, device_fingerprint, device_label, user_agent, platform, last_seen_at, created_at";

function getOrCreateFingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  let fp = localStorage.getItem(FP_KEY);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(FP_KEY, fp);
  }
  return fp;
}

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Web";
}

function detectLabel(): string {
  if (typeof navigator === "undefined") return "Device";
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android phone";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  return "This device";
}

export function useLinkedDevices() {
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const currentFingerprint = getOrCreateFingerprint();
  const currentLabel = detectLabel();
  const currentPlatform = detectPlatform();

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("linked_devices")
        .select(LINKED_DEVICE_COLUMNS)
        .order("last_seen_at", { ascending: false });
      if (error) throw error;
      setDevices((data ?? []) as unknown as UserDevice[]);
    } catch {
      const message =
        "Registered devices are temporarily unavailable. Try again to refresh the registry.";
      setLoadError(message);
      toast.error("Could not load registered devices");
    } finally {
      setLoading(false);
    }
  }, []);

  const registerCurrentDevice = useCallback(async () => {
    setRegistrationError(null);
    try {
      const { error } = await supabase.functions.invoke("device-register", {
        body: {
          fingerprint: currentFingerprint,
          label: currentLabel,
          platform: currentPlatform,
        },
      });
      if (error) throw error;
      return true;
    } catch {
      const message =
        "This device could not be registered right now. You can still review other registered devices.";
      setRegistrationError(message);
      toast.error("Could not register this device");
      return false;
    }
  }, [currentFingerprint, currentLabel, currentPlatform]);

  const retryRegistration = useCallback(async () => {
    await registerCurrentDevice();
    await fetchDevices();
  }, [fetchDevices, registerCurrentDevice]);

  // Register first, then read. This avoids a first-visit empty-state race.
  useEffect(() => {
    const bootstrap = async () => {
      await registerCurrentDevice();
      await fetchDevices();
    };
    void bootstrap();
  }, [fetchDevices, registerCurrentDevice]);

  const removeDevice = useCallback(
    async (id: string) => {
      const { error } = await supabase.functions.invoke("linked-device-manage", {
        body: { action: "remove", device_id: id },
      });
      if (error) {
        toast.error("Could not remove device");
        return;
      }
      toast.success("Device removed");
      setDevices((prev) => prev.filter((d) => d.id !== id));
    },
    [],
  );

  return {
    devices,
    loading,
    registrationError,
    loadError,
    refresh: fetchDevices,
    retryRegistration,
    removeDevice,
    currentFingerprint,
    currentLabel,
  };
}
