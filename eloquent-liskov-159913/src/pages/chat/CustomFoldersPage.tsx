/**
 * CustomFoldersPage — Manage Telegram-style chat folders.
 * Reads/writes the existing `chat_folders` table (already used by ChatFolders).
 * Supports create, rename, reorder (move up/down), and delete.
 */
import { useState } from "react";
import { useSmartBack } from "@/lib/smartBack";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import ArrowUp from "lucide-react/dist/esm/icons/arrow-up";
import ArrowDown from "lucide-react/dist/esm/icons/arrow-down";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import X from "lucide-react/dist/esm/icons/x";

const ICONS = ["📁", "⭐", "💼", "🏠", "❤️", "🎮", "📚", "🎵", "✈️", "🛒", "👨‍👩‍👧", "🤖"];

const SUGGESTED_FOLDERS: { name: string; icon: string }[] = [
  { name: "Unread", icon: "🔴" },
  { name: "Personal", icon: "👤" },
  { name: "Groups", icon: "👨‍👩‍👧" },
  { name: "Channels", icon: "📢" },
];

type ChatFolderRow = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  sort_order: number;
};

const dbFrom = (table: string): any => (supabase as any).from(table);

export default function CustomFoldersPage() {
  const nav = useNavigate();
  const goBack = useSmartBack("/chat");
  const { user } = useAuth();
  const qc = useQueryClient();

  const [editing, setEditing] = useState<{ id?: string; name: string; icon: string } | null>(null);

  const { data: folders = [] } = useQuery({
    queryKey: ["chat-folders", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await dbFrom("chat_folders")
        .select("*")
        .eq("user_id", user!.id)
        .order("sort_order", { ascending: true });
      return (data || []) as ChatFolderRow[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["chat-folders", user?.id] });

  const save = async () => {
    if (!user?.id || !editing?.name.trim()) return;
    if (editing.id) {
      const { error } = await dbFrom("chat_folders")
        .update({ name: editing.name.trim(), icon: editing.icon })
        .eq("id", editing.id);
      if (error) return toast.error("Could not save folder");
      toast.success("Folder updated");
    } else {
      const sort_order = folders.length;
      const { error } = await dbFrom("chat_folders")
        .insert({ user_id: user.id, name: editing.name.trim(), icon: editing.icon, sort_order });
      if (error) return toast.error("Could not create folder");
      toast.success("Folder created");
    }
    setEditing(null);
    refresh();
  };

  const addSuggested = async (preset: { name: string; icon: string }) => {
    if (!user?.id) return;
    if (folders.some((f) => f.name.toLowerCase() === preset.name.toLowerCase())) {
      toast.info(`"${preset.name}" already exists`);
      return;
    }
    const sort_order = folders.length;
    const { error } = await dbFrom("chat_folders").insert({
      user_id: user.id,
      name: preset.name,
      icon: preset.icon,
      sort_order,
    });
    if (error) return toast.error("Could not add folder");
    toast.success(`"${preset.name}" folder added`);
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await dbFrom("chat_folders").delete().eq("id", id);
    if (error) return toast.error("Could not delete");
    toast.success("Folder deleted");
    refresh();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= folders.length) return;
    const a = folders[idx];
    const b = folders[target];
    await dbFrom("chat_folders").update({ sort_order: b.sort_order }).eq("id", a.id);
    await dbFrom("chat_folders").update({ sort_order: a.sort_order }).eq("id", b.id);
    refresh();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 pt-safe px-3 py-3 flex items-center gap-2">
        <button type="button" onClick={goBack} className="p-1.5 rounded-full hover:bg-muted/60">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold flex-1">Chat Folders</h1>
        <button type="button"
          onClick={() => setEditing({ name: "", icon: "📁" })}
          className="p-1.5 rounded-full hover:bg-muted/60"
          aria-label="New folder"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <p className="px-4 py-3 text-xs text-muted-foreground">
        Group chats into folders. Reorder to control how tabs appear in the chat hub.
      </p>

      {folders.length === 0 && (
        <div className="mx-3 mb-3 rounded-xl bg-primary/5 border border-primary/20 p-3">
          <div className="text-xs font-semibold text-primary mb-2">Suggested folders</div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_FOLDERS.map((p) => (
              <button type="button"
                key={p.name}
                onClick={() => addSuggested(p)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-background border border-border/60 text-xs font-medium hover:bg-muted/60"
              >
                <span>{p.icon}</span>
                <span>{p.name}</span>
                <Plus className="w-3 h-3 opacity-60" />
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Tap to instantly add. You can rename or delete later.</p>
        </div>
      )}

      <div className="bg-card/60 rounded-xl mx-3 divide-y divide-border/30">
        {folders.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No folders yet. Tap a suggestion above or + to create one.
          </div>
        ) : folders.map((f, idx) => (
          <div key={f.id} className="flex items-center gap-3 px-4 py-3">
            <span className="text-xl">{f.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{f.name}</div>
              <div className="text-[11px] text-muted-foreground">Position {idx + 1}</div>
            </div>
            <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1.5 rounded-full hover:bg-muted/60 disabled:opacity-30">
              <ArrowUp className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => move(idx, 1)} disabled={idx === folders.length - 1} className="p-1.5 rounded-full hover:bg-muted/60 disabled:opacity-30">
              <ArrowDown className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setEditing({ id: f.id, name: f.name, icon: f.icon })} className="p-1.5 rounded-full hover:bg-muted/60">
              <Pencil className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => remove(f.id)} className="p-1.5 rounded-full hover:bg-muted/60 text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background rounded-2xl p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{editing.id ? "Edit folder" : "New folder"}</h3>
              <button type="button" onClick={() => setEditing(null)}><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {ICONS.map((ic) => (
                <button type="button"
                  key={ic}
                  onClick={() => setEditing({ ...editing, icon: ic })}
                  className={`text-lg p-2 rounded-lg ${editing.icon === ic ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted/50"}`}
                >
                  {ic}
                </button>
              ))}
            </div>
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Folder name..."
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button type="button" onClick={save} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
              {editing.id ? "Save changes" : "Create folder"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
