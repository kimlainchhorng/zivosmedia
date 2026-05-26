/**
 * useGroceryCart - Shopping cart for grocery/Walmart items
 * Persists to localStorage, separate from travel cart
 */
import { useState, useCallback, useEffect } from "react";

export interface GroceryCartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  brand: string;
  quantity: number;
  store: string;
  sizeLabel?: string; // e.g. "S", "M", "L"
}

const STORAGE_KEY = "zivo-grocery-cart";

export function useGroceryCart() {
  const [items, setItems] = useState<GroceryCartItem[]>(() => {
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

  const addItem = useCallback((product: Omit<GroceryCartItem, "quantity" | "store">, store = "Walmart") => {
    setItems((prev) => {
      // Match by productId + sizeLabel so different sizes are separate items
      const idx = prev.findIndex((i) => i.productId === product.productId && (i.sizeLabel || "") === (product.sizeLabel || ""));
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...prev, { ...product, quantity: 1, store }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return { items, addItem, removeItem, updateQuantity, clearCart, total, itemCount };
}
