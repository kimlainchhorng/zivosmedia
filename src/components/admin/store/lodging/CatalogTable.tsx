import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export interface CatalogColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface Props<T extends { id: string; active?: boolean }> {
  rows: T[];
  columns: CatalogColumn<T>[];
  isLoading?: boolean;
  emptyTitle: string;
  emptyBody: string;
  onAddClick: () => void;
  onEdit: (row: T) => void;
  onDelete: (id: string) => void;
  onToggleActive?: (row: T) => void;
  addLabel?: string;
}

export function CatalogTable<T extends { id: string; active?: boolean }>({
  rows,
  columns,
  isLoading,
  emptyTitle,
  emptyBody,
  onAddClick,
  onEdit,
  onDelete,
  onToggleActive,
  addLabel = "Add new",
}: Props<T>) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={onAddClick}>
          <Plus className="mr-1.5 h-4 w-4" /> {addLabel}
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{emptyBody}</p>
          <Button size="sm" className="mt-3" onClick={onAddClick}>
            <Plus className="mr-1.5 h-4 w-4" /> {addLabel}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              {columns.map((col) => (
                <div key={col.key} className={col.className || "min-w-0 flex-1"}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {col.label}
                  </p>
                  <div className="mt-0.5 text-sm text-foreground">{col.render(row)}</div>
                </div>
              ))}
              <div className="flex items-center gap-2">
                {onToggleActive && (
                  <Switch
                    checked={row.active !== false}
                    onCheckedChange={() => onToggleActive(row)}
                    aria-label="Active"
                  />
                )}
                <Button size="icon" variant="ghost" onClick={() => onEdit(row)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("Delete this item?")) onDelete(row.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EditorDialog({
  open,
  onOpenChange,
  title,
  children,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: ReactNode;
  onSave: () => void;
  saving?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { Dialog, DialogTrigger };
