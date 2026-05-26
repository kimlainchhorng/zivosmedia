export type ChatCategory = "personal" | "shop" | "support" | "ride";

export interface FolderTab {
  id: string;
  label: string;
  category: ChatCategory;
}

export interface BuiltInFolderDef {
  id: string;
  label: string;
  category: ChatCategory;
}

export interface CustomFolderDef {
  id: string;
  name: string;
  icon: string | null;
}

export interface FolderMemberRow {
  folder_id: string;
  conversation_id: string;
}

export type ChatRowLike = {
  id: string;
  unread?: number;
  isGroup?: boolean;
  isBusiness?: boolean;
  lastTime: string;
  lastMessage?: string;
  name?: string;
};

export function normalizeChatFolderLabel(label: string) {
  return label
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .toLowerCase();
}

export function buildChatHubFolderTabs({
  builtInFolders,
  customFolders,
  zivoOFMode,
}: {
  builtInFolders: BuiltInFolderDef[];
  customFolders: CustomFolderDef[];
  zivoOFMode: boolean;
}): FolderTab[] {
  const builtInLabelKeys = new Set(builtInFolders.map((folder) => normalizeChatFolderLabel(folder.label)));
  const seenCustomLabelKeys = new Map<string, number>();

  const customTabs = customFolders.map((folder) => {
    const baseName = String(folder.name || "Folder").trim() || "Folder";
    const normalized = normalizeChatFolderLabel(baseName);
    const duplicateWithBuiltIn = builtInLabelKeys.has(normalized);

    const seenCount = (seenCustomLabelKeys.get(normalized) || 0) + 1;
    seenCustomLabelKeys.set(normalized, seenCount);

    let displayName = baseName;
    if (duplicateWithBuiltIn) displayName = `${displayName} (Custom)`;
    if (seenCount > 1) displayName = `${displayName} ${seenCount}`;

    return {
      id: `custom:${folder.id}`,
      label: `${folder.icon || "📁"} ${displayName}`,
      category: "personal" as ChatCategory,
    };
  });

  if (zivoOFMode) {
    return builtInFolders.filter((folder) => folder.id === "all" || folder.id === "unread" || folder.id === "personal");
  }

  return [...builtInFolders, ...customTabs];
}

export function buildChatHubActionsFolderMembership({
  actionsTargetId,
  customFolders,
  customFolderMemberMap,
}: {
  actionsTargetId: string | null;
  customFolders: CustomFolderDef[];
  customFolderMemberMap: Map<string, Set<string>>;
}): Set<string> {
  if (!actionsTargetId) return new Set<string>();
  const membership = new Set<string>();
  for (const folder of customFolders) {
    const members = customFolderMemberMap.get(folder.id);
    if (members?.has(actionsTargetId)) membership.add(folder.id);
  }
  return membership;
}

export function buildChatHubUnreadMaps({
  personalChats,
  groupChats,
  shopChats,
  supportChats,
  rideChats,
  customFolders,
  customFolderMemberMap,
}: {
  personalChats: ChatRowLike[];
  groupChats: ChatRowLike[];
  shopChats: ChatRowLike[];
  supportChats: ChatRowLike[];
  rideChats: ChatRowLike[];
  customFolders: CustomFolderDef[];
  customFolderMemberMap: Map<string, Set<string>>;
}) {
  const personalUnread = personalChats.reduce((sum, chat) => sum + (chat.unread || 0), 0);
  const shopUnread = shopChats.reduce((sum, chat) => sum + (chat.unread || 0), 0);
  const rideUnread = rideChats.reduce((sum, chat) => sum + (chat.unread || 0), 0);
  const supportUnread = supportChats.reduce((sum, chat) => sum + (chat.unread || 0), 0);

  const builtInFolderUnreadMap = {
    all: personalUnread,
    unread: personalUnread,
    personal: personalChats.filter((chat) => !chat.isGroup).reduce((sum, chat) => sum + (chat.unread || 0), 0),
    groups: groupChats.reduce((sum, chat) => sum + (chat.unread || 0), 0),
    shop: shopUnread,
    support: supportUnread,
    ride: rideUnread,
  };

  const customFolderUnreadMap: Record<string, number> = {};
  const personalPool = [...personalChats, ...groupChats];
  for (const folder of customFolders) {
    const members = customFolderMemberMap.get(folder.id);
    if (!members) {
      customFolderUnreadMap[`custom:${folder.id}`] = 0;
      continue;
    }
    customFolderUnreadMap[`custom:${folder.id}`] = personalPool
      .filter((chat) => members.has(chat.id))
      .reduce((sum, chat) => sum + (chat.unread || 0), 0);
  }

  return {
    personalUnread,
    shopUnread,
    rideUnread,
    supportUnread,
    builtInFolderUnreadMap,
    customFolderUnreadMap,
    folderUnreadMap: {
      ...builtInFolderUnreadMap,
      ...customFolderUnreadMap,
    },
  };
}

export function filterChatHubRows({
  rows,
  folder,
  zivoOFMode,
  customFolderMemberMap,
  isMarkedUnread,
  isArchived,
}: {
  rows: ChatRowLike[];
  folder: string;
  zivoOFMode: boolean;
  customFolderMemberMap: Map<string, Set<string>>;
  isMarkedUnread: (id: string) => boolean;
  isArchived: (id: string) => boolean;
}) {
  const folderFiltered = rows.filter((row) => {
    if (zivoOFMode && (row.isGroup || row.isBusiness)) return false;
    if (folder.startsWith("custom:")) {
      const customFolderId = folder.slice("custom:".length);
      const members = customFolderMemberMap.get(customFolderId);
      return members?.has(row.id) === true;
    }
    if (folder === "unread") return (row.unread || 0) > 0 || isMarkedUnread(row.id);
    if (folder === "personal") return !row.isGroup;
    if (folder === "groups") return !!row.isGroup;
    return true;
  });

  const archivedList = folderFiltered.filter((row) => isArchived(row.id));
  const visibleList = folderFiltered.filter((row) => !isArchived(row.id));

  return {
    folderFiltered,
    archivedList,
    visibleList,
  };
}

export function sortChatHubRowsByPinAndDate<T extends { id: string; lastTime: string }>(
  list: T[],
  isPinned: (id: string) => boolean,
) {
  return [...list].sort((a, b) => {
    const pa = isPinned(a.id) ? 1 : 0;
    const pb = isPinned(b.id) ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime();
  });
}
