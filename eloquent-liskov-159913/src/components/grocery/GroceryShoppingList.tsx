/**
 * GroceryShoppingList - Persistent shopping list drawer
 * Users build a list before browsing, check off items as they add to cart
 */
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Plus, X, Check, Trash2, ChevronDown, ChevronUp, ShoppingBag } from "lucide-react";
import { useShoppingList } from "@/hooks/useShoppingList";
import { Button } from "@/components/ui/button";

interface GroceryShoppingListProps {
  onSearchItem?: (text: string) => void;
}

export function GroceryShoppingList({ onSearchItem }: GroceryShoppingListProps) {
  const list = useShoppingList();
  const [isExpanded, setIsExpanded] = useState(false);
  const [newItem, setNewItem] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!newItem.trim()) return;
    list.addItem(newItem);
    setNewItem("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  // Floating pill when collapsed
  if (!isExpanded) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(true)}
        className="mx-4 mt-3 mb-1 flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-border/30 bg-card hover:border-primary/20 hover:shadow-md transition-all duration-200 w-full"
      >
        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <ClipboardList className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-[12px] font-bold text-foreground">Shopping List</p>
          <p className="text-[10px] text-muted-foreground">
            {list.items.length === 0
              ? "Plan what you need"
              : `${list.uncheckedCount} remaining · ${list.checkedCount} done`}
          </p>
        </div>
        {list.uncheckedCount > 0 && (
          <span className="flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
            {list.uncheckedCount}
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-3 mb-1 rounded-[20px] border border-border/30 bg-card overflow-hidden shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/15">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="text-[13px] font-bold">Shopping List</h3>
          {list.items.length > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-full font-semibold">
              {list.uncheckedCount}/{list.items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {list.checkedCount > 0 && (
            <button type="button" onClick={list.clearChecked} className="text-[10px] text-muted-foreground hover:text-destructive font-medium transition-colors">
              Clear done
            </button>
          )}
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsExpanded(false)} className="p-1 rounded-lg hover:bg-muted/50">
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        </div>
      </div>

      {/* Add item input */}
      <div className="flex gap-2 p-3 border-b border-border/10">
        <input
          ref={inputRef}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add item (e.g., milk, bread)..."
          className="flex-1 h-9 px-3 rounded-xl text-[12px] bg-muted/20 border border-border/20 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-opacity"
        >
          <Plus className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Items */}
      <div className="max-h-[200px] overflow-y-auto scrollbar-hide">
        {list.items.length === 0 ? (
          <div className="text-center py-6 px-4">
            <ShoppingBag className="h-8 w-8 text-muted-foreground/15 mx-auto mb-2" />
            <p className="text-[11px] text-muted-foreground">Add items to your shopping list</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Keep track of what you need</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {list.items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8, height: 0 }}
                className={`flex items-center gap-2.5 px-3 py-2 border-b border-border/5 group transition-colors ${
                  item.checked ? "bg-muted/10" : "hover:bg-muted/5"
                }`}
              >
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={() => list.toggleItem(item.id)}
                  className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                    item.checked
                      ? "bg-primary border-primary"
                      : "border-border/40 hover:border-primary/40"
                  }`}
                >
                  {item.checked && <Check className="h-3 w-3 text-primary-foreground" />}
                </motion.button>
                <button type="button"
                  onClick={() => onSearchItem?.(item.text)}
                  className={`flex-1 text-left text-[12px] font-medium transition-all hover:text-primary ${
                    item.checked
                      ? "line-through text-muted-foreground/50"
                      : "text-foreground"
                  }`}
                >
                  {item.text}
                </button>
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={() => list.removeItem(item.id)}
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer with quick action */}
      {list.uncheckedCount > 0 && onSearchItem && (
        <div className="p-2 border-t border-border/10">
          <p className="text-[9px] text-muted-foreground text-center">
            Tap an item to search for it
          </p>
        </div>
      )}
    </motion.div>
  );
}
