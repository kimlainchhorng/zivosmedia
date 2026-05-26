import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { subscribeToPooledPostgresChangesGroup } from "@/services/chatRealtimePool";

export function useChatHubRealtimeInvalidation({
  userId,
  queryClient,
  invalidateDebounceMs,
  setSyncMode,
}: {
  userId: string | undefined;
  queryClient: QueryClient;
  invalidateDebounceMs: number;
  setSyncMode: Dispatch<SetStateAction<"live" | "fallback">>;
}) {
  useEffect(() => {
    if (!userId) return;

    const pendingInvalidations = new Map<string, ReturnType<typeof setTimeout>>();
    const scheduleInvalidate = (key: string, run: () => void) => {
      const existing = pendingInvalidations.get(key);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        pendingInvalidations.delete(key);
        run();
      }, invalidateDebounceMs);
      pendingInvalidations.set(key, timer);
    };

    const invalidatePersonal = () => {
      scheduleInvalidate("chat-hub-personal", () => {
        void queryClient.invalidateQueries({ queryKey: ["chat-hub-personal", userId] });
      });
      scheduleInvalidate("chat-hub-groups", () => {
        void queryClient.invalidateQueries({ queryKey: ["chat-hub-groups", userId] });
      });
    };
    const invalidateShop = () => {
      scheduleInvalidate("chat-hub-shop", () => {
        void queryClient.invalidateQueries({ queryKey: ["chat-hub-shop", userId] });
      });
    };
    const invalidateRide = () => {
      scheduleInvalidate("chat-hub-ride", () => {
        void queryClient.invalidateQueries({ queryKey: ["chat-hub-ride", userId] });
      });
    };
    const invalidateSupport = () => {
      scheduleInvalidate("chat-hub-support", () => {
        void queryClient.invalidateQueries({ queryKey: ["chat-hub-support", userId] });
      });
    };
    const invalidateFolders = () => {
      scheduleInvalidate("chat-folders", () => {
        void queryClient.invalidateQueries({ queryKey: ["chat-folders", userId] });
      });
      scheduleInvalidate("chat-folder-members", () => {
        void queryClient.invalidateQueries({ queryKey: ["chat-folder-members", userId] });
      });
    };

    const onPersonalTables = new Set(["direct_messages", "group_messages", "chat_groups", "chat_group_members"]);
    const onShopTables = new Set(["store_chats", "store_chat_messages"]);
    const onRideTables = new Set(["trip_messages"]);
    const onSupportTables = new Set(["support_tickets", "ticket_replies"]);
    const onFolderTables = new Set(["chat_folders", "chat_folder_members"]);

    const unsubscribe = subscribeToPooledPostgresChangesGroup(
      `chat-hub-side-tabs:${userId}`,
      [
        { event: "*", schema: "public", table: "direct_messages" },
        { event: "*", schema: "public", table: "group_messages" },
        { event: "*", schema: "public", table: "chat_groups" },
        { event: "*", schema: "public", table: "chat_group_members" },
        { event: "*", schema: "public", table: "store_chats" },
        { event: "*", schema: "public", table: "store_chat_messages" },
        { event: "*", schema: "public", table: "trip_messages" },
        { event: "*", schema: "public", table: "support_tickets" },
        { event: "*", schema: "public", table: "ticket_replies" },
        { event: "*", schema: "public", table: "chat_folders" },
        { event: "*", schema: "public", table: "chat_folder_members" },
      ],
      ({ subscription }) => {
        const table = subscription.table;
        if (onPersonalTables.has(table)) {
          invalidatePersonal();
          return;
        }
        if (onShopTables.has(table)) {
          invalidateShop();
          return;
        }
        if (onRideTables.has(table)) {
          invalidateRide();
          return;
        }
        if (onSupportTables.has(table)) {
          invalidateSupport();
          return;
        }
        if (onFolderTables.has(table)) {
          invalidateFolders();
        }
      },
      {
        onStatusChange: (status) => {
          if (status === "SUBSCRIBED") {
            setSyncMode((prev) => (prev === "live" ? prev : "live"));
            return;
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setSyncMode((prev) => (prev === "fallback" ? prev : "fallback"));
          }
        },
      }
    );

    return () => {
      pendingInvalidations.forEach((timer) => clearTimeout(timer));
      pendingInvalidations.clear();
      unsubscribe();
    };
  }, [invalidateDebounceMs, queryClient, setSyncMode, userId]);
}
