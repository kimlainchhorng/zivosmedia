/**
 * Travel Cart Context
 * Manages hotel, activity, and transfer items for checkout
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface TravelCartItem {
  id: string;
  type: "hotel" | "activity" | "transfer";
  title: string;
  subtitle?: string;
  startDate: string;
  endDate?: string;
  adults: number;
  children: number;
  quantity: number;
  price: number;
  currency: string;
  imageUrl?: string;
  meta: Record<string, unknown>;
}

interface TravelCartContextType {
  items: TravelCartItem[];
  addItem: (item: TravelCartItem) => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, updates: Partial<TravelCartItem>) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  hasItemOfType: (type: TravelCartItem["type"]) => boolean;
}

const TravelCartContext = createContext<TravelCartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "zivo-travel-cart";

export function TravelCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<TravelCartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: TravelCartItem) => {
    setItems((prev) => {
      // Check if item already exists (by id)
      const existingIndex = prev.findIndex((i) => i.id === item.id);
      if (existingIndex > -1) {
        // Replace existing item
        const updated = [...prev];
        updated[existingIndex] = item;
        return updated;
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const updateItem = useCallback((itemId: string, updates: Partial<TravelCartItem>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.reduce((count, item) => count + item.quantity, 0);
  }, [items]);

  const hasItemOfType = useCallback(
    (type: TravelCartItem["type"]) => {
      return items.some((item) => item.type === type);
    },
    [items]
  );

  return (
    <TravelCartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateItem,
        clearCart,
        getTotal,
        getItemCount,
        hasItemOfType,
      }}
    >
      {children}
    </TravelCartContext.Provider>
  );
}

export function useTravelCart() {
  const context = useContext(TravelCartContext);
  if (context === undefined) {
    throw new Error("useTravelCart must be used within a TravelCartProvider");
  }
  return context;
}
