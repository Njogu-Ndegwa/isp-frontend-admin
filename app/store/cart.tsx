'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CartItem, ShopProduct } from '../lib/types';

interface CartContextValue {
  items: CartItem[];
  addItem: (product: ShopProduct, qty?: number) => void;
  removeItem: (productId: number) => void;
  updateQty: (productId: number, qty: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside StoreLayout');
  return ctx;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bitwave_cart');
      if (saved) setItems(JSON.parse(saved));
    } catch {}
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try { localStorage.setItem('bitwave_cart', JSON.stringify(next)); } catch {}
  }, []);

  const addItem = useCallback((product: ShopProduct, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      const next = existing
        ? prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i)
        : [...prev, { product, quantity: qty }];
      try { localStorage.setItem('bitwave_cart', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    persist(items.filter(i => i.product.id !== productId));
  }, [items, persist]);

  const updateQty = useCallback((productId: number, qty: number) => {
    if (qty <= 0) { persist(items.filter(i => i.product.id !== productId)); return; }
    persist(items.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  }, [items, persist]);

  const clearCart = useCallback(() => {
    persist([]);
  }, [persist]);

  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}
