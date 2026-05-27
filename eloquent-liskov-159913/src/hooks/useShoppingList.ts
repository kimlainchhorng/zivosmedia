/**
 * useShoppingList - Persistent shopping list that users build before browsing
 * Stores items in localStorage for quick reference while shopping
 */
import { useState, useCallback, useEffect } from "react";

export interface ShoppingListItem {
  id: string;
  text: string;
  checked: boolean;
  addedAt: string;
  matchedProductId?: string; // When an item is matched to a real product
}

const STORAGE_KEY = "zivo-shopping-list";

export function useShoppingList() {
  const [items, setItems] = useState<ShoppingListItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((text: string) => {
    if (!text.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID().slice(0, 8),
        text: text.trim(),
        checked: false,
        addedAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
    );
  }, []);

  const markMatched = useCallback((id: string, productId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked: true, matchedProductId: productId } : i))
    );
  }, []);

  const clearChecked = useCallback(() => {
    setItems((prev) => prev.filter((i) => !i.checked));
  }, []);

  const clearAll = useCallback(() => setItems([]), []);

  const uncheckedCount = items.filter((i) => !i.checked).length;
  const checkedCount = items.filter((i) => i.checked).length;

  return { items, addItem, removeItem, toggleItem, markMatched, clearChecked, clearAll, uncheckedCount, checkedCount };
}
