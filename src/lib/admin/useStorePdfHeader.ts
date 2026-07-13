/**
 * useStorePdfHeader — loads a shop's invoice/estimate PDF header from
 * store_profiles + ar_settings (name, address, contact, state reg, terms) and
 * converts the logo to a PNG data URL so jsPDF can embed it. Shared by every
 * auto-repair screen that opens the document preview, so the printed header is
 * identical whether it's launched from Invoices, Estimates, or Build R.O.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StorePdfHeader = {
  name?: string;
  address?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  stateReg?: string;
  logoUrl?: string;
  termsPolicy?: string;
};

export function useStorePdfHeader(storeId?: string) {
  const [storeInfo, setStoreInfo] = useState<StorePdfHeader>({});
  const [storeLogoData, setStoreLogoData] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("store_profiles")
        .select("name, address, phone, logo_url, ar_settings")
        .eq("id", storeId)
        .maybeSingle();
      if (!data || cancelled) return;
      const s = ((data as any).ar_settings || {}) as Record<string, any>;
      setStoreInfo({
        name: data.name || undefined,
        address: data.address || undefined,
        phone: data.phone || undefined,
        phone2: s.phone_l2 || s.phone2 || undefined,
        email: s.invoice_email || s.contact_email || s.email || undefined,
        stateReg: s.state_reg_no || s.state_reg || undefined,
        logoUrl: (data as any).logo_url || undefined,
        termsPolicy: s.terms_policy || undefined,
      });
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  // Convert the logo to a PNG data URL (CORS-permitting); silently skip on failure.
  useEffect(() => {
    const url = storeInfo.logoUrl;
    if (!url || typeof document === "undefined") { setStoreLogoData(undefined); return; }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        if (!cancelled) setStoreLogoData(c.toDataURL("image/png"));
      } catch { /* tainted canvas / decode error — skip logo */ }
    };
    img.src = url;
    return () => { cancelled = true; };
  }, [storeInfo.logoUrl]);

  return { storeInfo, storeLogoData };
}
