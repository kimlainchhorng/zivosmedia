import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Pin from "lucide-react/dist/esm/icons/pin";
import BellOff from "lucide-react/dist/esm/icons/bell-off";
import Bell from "lucide-react/dist/esm/icons/bell";
import CheckCheck from "lucide-react/dist/esm/icons/check-check";
import Circle from "lucide-react/dist/esm/icons/circle";
import Archive from "lucide-react/dist/esm/icons/archive";
import ArchiveRestore from "lucide-react/dist/esm/icons/archive-restore";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Eraser from "lucide-react/dist/esm/icons/eraser";
import FolderPlus from "lucide-react/dist/esm/icons/folder-plus";
import FolderMinus from "lucide-react/dist/esm/icons/folder-minus";
import { cn } from "@/lib/utils";

export interface ChatRowActionsTarget {
  id: string;
  name: string;
  isGroup?: boolean;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  hasUnread: boolean;
  /** True if the chat has been manually marked unread (no real unread messages). */
  isMarkedUnread?: boolean;
}

interface Props {
  target: ChatRowActionsTarget | null;
  customFolders?: { id: string; name: string; icon: string | null }[];
  folderMembership?: Set<string>;
  canManageFolders?: boolean;
  canToggleReadState?: boolean;
  canClearHistory?: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onMarkRead: () => void;
  onMarkUnread?: () => void;
  onToggleArchive: () => void;
  onClearHistory: () => void;
  onDelete: () => void;
  onAddToFolder?: (folderId: string) => void;
  onRemoveFromFolder?: (folderId: string) => void;
}

export default function ChatRowActionsSheet({
  customFolders = [],
  folderMembership,
  canManageFolders = true,
  canToggleReadState = true,
  canClearHistory = true,
  target, onClose, onTogglePin, onToggleMute, onMarkRead, onMarkUnread,
  onToggleArchive, onClearHistory, onDelete, onAddToFolder, onRemoveFromFolder,
}: Props) {
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const membership = folderMembership || new Set<string>();
  if (!target) return null;

  let folderSummary = "No custom folders";
  if (customFolders.length) {
    const joined = customFolders
      .filter((f) => membership.has(f.id))
      .map((f) => `${f.icon || "📁"} ${f.name}`);
    if (!joined.length) folderSummary = "Not added to any folder";
    else if (joined.length === 1) folderSummary = joined[0];
    else folderSummary = `${joined[0]} +${joined.length - 1}`;
  }

  // Show "Mark as read" when the chat actually has unread messages or is manually flagged.
  // Show "Mark as unread" otherwise — Telegram parity for "come back to this later".
  const showMarkUnread = canToggleReadState && !target.hasUnread && !target.isMarkedUnread && !!onMarkUnread;
  const showMarkRead = canToggleReadState && (target.hasUnread || target.isMarkedUnread);
  const items = [
    { key: "pin", label: target.isPinned ? "Unpin" : "Pin to top", icon: Pin, onClick: onTogglePin },
    { key: "mute", label: target.isMuted ? "Unmute" : "Mute notifications", icon: target.isMuted ? Bell : BellOff, onClick: onToggleMute },
    ...(showMarkRead
      ? [{ key: "read", label: "Mark as read", icon: CheckCheck, onClick: onMarkRead }]
      : []),
    ...(showMarkUnread && onMarkUnread
      ? [{ key: "unread", label: "Mark as unread", icon: Circle, onClick: onMarkUnread }]
      : []),
    { key: "archive", label: target.isArchived ? "Unarchive" : "Archive chat", icon: target.isArchived ? ArchiveRestore : Archive, onClick: onToggleArchive },
    ...(canClearHistory ? [{ key: "clear", label: "Clear history", icon: Eraser, onClick: onClearHistory }] : []),
    { key: "delete", label: "Delete chat", icon: Trash2, onClick: onDelete, destructive: true },
  ];

  return (
    <Sheet open={!!target} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        className={cn(
          "z-[10000] max-h-[86dvh] overflow-y-auto rounded-t-3xl pb-8",
          "sm:inset-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[min(420px,calc(100vw-32px))]",
          "sm:max-h-[min(620px,calc(100dvh-64px))] sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:rounded-2xl sm:border sm:p-5 sm:pb-5",
          "sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0",
          "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95"
        )}
      >
        <SheetHeader className="text-left pr-10">
          <SheetTitle className="text-base truncate">{target.name}</SheetTitle>
        </SheetHeader>

        {canManageFolders && customFolders.length > 0 && (
          <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 p-2">
            <button type="button"
              onClick={() => setShowFolderMenu((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/60"
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <FolderPlus className="w-4 h-4" />
                Folders
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[65%] text-right">{folderSummary}</span>
            </button>

            {showFolderMenu && (
              <div className="mt-2 flex flex-col gap-1 max-h-52 overflow-y-auto pr-1">
                {customFolders.map((folder) => {
                  const inFolder = membership.has(folder.id);
                  return (
                    <button type="button"
                      key={folder.id}
                      onClick={() => {
                        if (inFolder) {
                          onRemoveFromFolder?.(folder.id);
                        } else {
                          onAddToFolder?.(folder.id);
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between gap-2 px-2 py-2 rounded-lg text-left",
                        "hover:bg-muted/60 active:scale-[0.99] transition-all"
                      )}
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <span className="text-base">{folder.icon || "📁"}</span>
                        <span className="text-sm truncate text-foreground">{folder.name}</span>
                      </span>
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-medium",
                        inFolder ? "text-amber-600" : "text-primary"
                      )}>
                        {inFolder ? <FolderMinus className="w-3.5 h-3.5" /> : <FolderPlus className="w-3.5 h-3.5" />}
                        {inFolder ? "Remove" : "Add"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-0.5">
          {items.map((it) => {
            const Icon = it.icon;
            const disabled = (it as { disabled?: boolean }).disabled;
            return (
              <button type="button"
                key={it.key}
                disabled={disabled}
                onClick={() => { it.onClick(); onClose(); }}
                className={cn(
                  "flex items-center gap-3 px-2 py-3 text-left rounded-xl active:scale-[0.98] transition-all",
                  disabled && "opacity-40",
                  it.destructive ? "text-destructive" : "text-foreground",
                  "hover:bg-muted/60"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{it.label}</span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
