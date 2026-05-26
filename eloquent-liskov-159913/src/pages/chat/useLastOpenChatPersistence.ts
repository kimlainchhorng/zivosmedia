import { useEffect, useRef } from "react";

type ChatCategory = "personal" | "shop" | "support" | "ride";

type OpenPersonalChat = { id: string; name: string; avatar?: string | null; isVerified?: boolean } | null;
type OpenGroupChat = { id: string; name: string; avatar?: string | null } | null;
type OpenShopChat = { storeId: string; name: string; logo?: string | null } | null;
type OpenRideChat = { rideRequestId: string; counterpartName?: string } | null;
type OpenSupportChat = { ticketId: string } | null;

type PersistedOpenChat =
  | { kind: "personal"; id: string; name: string; avatar?: string | null; isVerified?: boolean }
  | { kind: "group"; id: string; name: string; avatar?: string | null }
  | { kind: "shop"; storeId: string; name: string; logo?: string | null }
  | { kind: "ride"; rideRequestId: string; counterpartName?: string }
  | { kind: "support"; ticketId: string };

export function useLastOpenChatPersistence({
  userId,
  lastOpenChatKey,
  shouldSkipRestore,
  locationState,
  searchParamsKey,
  openPersonalChat,
  openGroupChat,
  openShopChat,
  openRideChat,
  openSupportChat,
  setActive,
  setOpenPersonalChat,
  setOpenGroupChat,
  setOpenShopChat,
  setOpenRideChat,
  setOpenSupportChat,
}: {
  userId: string | undefined;
  lastOpenChatKey: string;
  shouldSkipRestore: boolean;
  locationState: unknown;
  searchParamsKey: string;
  openPersonalChat: OpenPersonalChat;
  openGroupChat: OpenGroupChat;
  openShopChat: OpenShopChat;
  openRideChat: OpenRideChat;
  openSupportChat: OpenSupportChat;
  setActive: (category: ChatCategory) => void;
  setOpenPersonalChat: (chat: OpenPersonalChat) => void;
  setOpenGroupChat: (chat: OpenGroupChat) => void;
  setOpenShopChat: (chat: OpenShopChat) => void;
  setOpenRideChat: (chat: OpenRideChat) => void;
  setOpenSupportChat: (chat: OpenSupportChat) => void;
}) {
  const hasRestoredLastChatRef = useRef(false);

  useEffect(() => {
    if (hasRestoredLastChatRef.current || !userId) return;
    hasRestoredLastChatRef.current = true;

    if (shouldSkipRestore) return;

    try {
      const raw = localStorage.getItem(`${lastOpenChatKey}:${userId}`);
      if (!raw) return;
      const persisted = JSON.parse(raw) as PersistedOpenChat;
      if (persisted.kind === "personal") {
        setActive("personal");
        setOpenPersonalChat({ id: persisted.id, name: persisted.name, avatar: persisted.avatar || null, isVerified: persisted.isVerified === true });
      } else if (persisted.kind === "group") {
        setActive("personal");
        setOpenGroupChat({ id: persisted.id, name: persisted.name, avatar: persisted.avatar || null });
      } else if (persisted.kind === "shop") {
        setActive("shop");
        setOpenShopChat({ storeId: persisted.storeId, name: persisted.name, logo: persisted.logo || null });
      } else if (persisted.kind === "ride") {
        setActive("ride");
        setOpenRideChat({ rideRequestId: persisted.rideRequestId, counterpartName: persisted.counterpartName });
      } else if (persisted.kind === "support") {
        setActive("support");
        setOpenSupportChat({ ticketId: persisted.ticketId });
      }
    } catch {}
  }, [lastOpenChatKey, locationState, searchParamsKey, setActive, setOpenGroupChat, setOpenPersonalChat, setOpenRideChat, setOpenShopChat, setOpenSupportChat, shouldSkipRestore, userId]);

  useEffect(() => {
    if (!userId || !hasRestoredLastChatRef.current) return;
    const storageKey = `${lastOpenChatKey}:${userId}`;
    try {
      if (openPersonalChat) {
        const payload: PersistedOpenChat = {
          kind: "personal",
          id: openPersonalChat.id,
          name: openPersonalChat.name,
          avatar: openPersonalChat.avatar || null,
          isVerified: openPersonalChat.isVerified === true,
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        return;
      }
      if (openGroupChat) {
        const payload: PersistedOpenChat = {
          kind: "group",
          id: openGroupChat.id,
          name: openGroupChat.name,
          avatar: openGroupChat.avatar || null,
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        return;
      }
      if (openShopChat) {
        const payload: PersistedOpenChat = {
          kind: "shop",
          storeId: openShopChat.storeId,
          name: openShopChat.name,
          logo: openShopChat.logo || null,
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        return;
      }
      if (openRideChat) {
        const payload: PersistedOpenChat = {
          kind: "ride",
          rideRequestId: openRideChat.rideRequestId,
          counterpartName: openRideChat.counterpartName,
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        return;
      }
      if (openSupportChat) {
        const payload: PersistedOpenChat = {
          kind: "support",
          ticketId: openSupportChat.ticketId,
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        return;
      }
      localStorage.removeItem(storageKey);
    } catch {}
  }, [lastOpenChatKey, openGroupChat, openPersonalChat, openRideChat, openShopChat, openSupportChat, userId]);
}
