/**
 * useLinkedDevices — read & manage the current user's signed-in devices,
 * register the local device on mount, and trigger sign-out for a given device.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserDevice {
  id: string;
  device_label: string | null;
  user_agent: string | null;
  platform: string | null;
  last_seen_at: string;
  created_at: string;
}

const FP_KEY = "zivo_device_fp";

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

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("linked_devices")
      .select("*")
      .order("last_seen_at", { ascending: false });
    if (error) {
      toast.error("Could not load devices");
    } else {
      setDevices((data ?? []) as unknown as UserDevice[]);
    }
    setLoading(false);
  }, []);

  // Register the current device on mount.
  useEffect(() => {
    void supabase.functions.invoke("device-register", {
      body: {
        fingerprint: getOrCreateFingerprint(),
        label: detectLabel(),
        platform: detectPlatform(),
      },
    });
    void fetchDevices();
  }, [fetchDevices]);

  const removeDevice = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("linked_devices").delete().eq("id", id);
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
    refresh: fetchDevices,
    removeDevice,
    currentFingerprint: getOrCreateFingerprint(),
    currentLabel: detectLabel(),
  };
}
