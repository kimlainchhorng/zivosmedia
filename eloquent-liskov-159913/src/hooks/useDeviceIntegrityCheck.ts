/** Device integrity check — validates via edge function */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useDeviceIntegrityCheck() {
  const { user } = useAuth();
  const [isIntegrityValid, setIsIntegrityValid] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!user) return;
    setIsChecking(true);
    supabase.functions.invoke("check-device-integrity", {
      body: { user_id: user.id, user_agent: navigator.userAgent },
    }).then(({ data }) => {
      setIsIntegrityValid(data?.valid !== false);
    }).catch(() => {
      // Default to valid if check fails to avoid blocking users
      setIsIntegrityValid(true);
    }).finally(() => {
      setIsChecking(false);
    });
  }, [user?.id]);

  return { isIntegrityValid, isChecking };
}
