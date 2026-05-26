/**
 * ChatFolders — Organize conversations into folders
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FolderPlus from "lucide-react/dist/esm/icons/folder-plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import X from "lucide-react/dist/esm/icons/x";
import Plus from "lucide-react/dist/esm/icons/plus";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatFoldersProps {
  activeFolder: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

interface ChatFolderRow {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  sort_order: number | null;
}

export default function ChatFolders({ activeFolder, onSelectFolder }: ChatFoldersProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📁");

  const { data: folders = [] } = useQuery({
    queryKey: ["chat-folders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("chat_folders" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });
      return (data ?? []) as ChatFolderRow[];
    },
    enabled: !!user,
  });

  const createFolder = async () => {
    if (!user || !newName.trim()) return;
    await (supabase as any).from("chat_folders").insert({
      user_id: user.id,
      name: newName.trim(),
      icon: newIcon,
    });
    queryClient.invalidateQueries({ queryKey: ["chat-folders"] });
    setNewName("");
    setShowCreate(false);
    toast.success("Folder created");
  };

  const deleteFolder = async (id: string) => {
    await (supabase as any).from("chat_folders").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["chat-folders"] });
    if (activeFolder === id) onSelectFolder(null);
    toast.success("Folder deleted");
  };

  const icons = ["📁", "⭐", "💼", "🏠", "❤️", "🎮", "📚", "🎵"];

  return (
    <div className="flex gap-1.5 px-4 py-2 overflow-x-auto scrollbar-hide">
      {/* All chats */}
      <button type="button"
        onClick={() => onSelectFolder(null)}
        className={cn(
          "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
          !activeFolder ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
        )}
      >
        All
      </button>

      {folders.map((f) => (
        <button type="button"
          key={f.id}
          onClick={() => onSelectFolder(f.id)}
          onDoubleClick={() => deleteFolder(f.id)}
          className={cn(
            "shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            activeFolder === f.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
          )}
        >
          <span>{f.icon}</span> {f.name}
        </button>
      ))}

      {/* Add folder */}
      <button type="button"
        onClick={() => setShowCreate(true)}
        className="shrink-0 h-7 w-7 rounded-full bg-muted/50 flex items-center justify-center"
      >
        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <div className="bg-background rounded-2xl p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">New Folder</h3>
                <button type="button" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></button>
              </div>
              <div className="flex gap-1.5 mb-3">
                {icons.map((ic) => (
                  <button type="button"
                    key={ic}
                    onClick={() => setNewIcon(ic)}
                    className={cn("text-lg p-1.5 rounded-lg", newIcon === ic && "bg-primary/10 ring-1 ring-primary/30")}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Folder name..."
                className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
              <button type="button" onClick={createFolder} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
                Create Folder
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
