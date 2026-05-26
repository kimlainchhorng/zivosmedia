import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AdminVertical =
  | "restaurant"
  | "business"
  | "grocery"
  | "retail"
  | "cafe"
  | "service"
  | "mobility"
  | "generic";

interface AdminContextValue {
  vertical: AdminVertical;
  currentStoreId: string | null;
  setCurrentStoreId: (id: string | null) => void;
}

const Ctx = createContext<AdminContextValue | undefined>(undefined);

const STORAGE_KEY = "zivo.admin.currentStoreId";

interface ProviderProps {
  vertical: AdminVertical;
  children: ReactNode;
}

export function AdminContextProvider({ vertical, children }: ProviderProps) {
  const [currentStoreId, setCurrentStoreIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (currentStoreId) window.localStorage.setItem(STORAGE_KEY, currentStoreId);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [currentStoreId]);

  const value = useMemo(
    () => ({ vertical, currentStoreId, setCurrentStoreId: setCurrentStoreIdState }),
    [vertical, currentStoreId],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminContext(): AdminContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminContext must be used inside <AdminContextProvider>");
  return v;
}
