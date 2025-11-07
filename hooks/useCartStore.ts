'use client';

import { useSyncExternalStore } from 'react';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
}

interface CartStoreSnapshot {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  total: number;
  addItem: (payload: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

let cartState: CartItem[] = [];

const listeners = new Set<() => void>();

const addItem = (payload: Omit<CartItem, 'quantity'>, quantity = 1) => {
  setState((prev) => {
    const existing = prev.find((item) => item.productId === payload.productId);
    if (existing) {
      return prev.map((item) =>
        item.productId === payload.productId
          ? { ...item, quantity: Math.min(item.quantity + quantity, 99) }
          : item
      );
    }
    return [...prev, { ...payload, quantity: Math.min(quantity, 99) }];
  });
};

const increment = (productId: string) => {
  setState((prev) =>
    prev.map((item) =>
      item.productId === productId ? { ...item, quantity: Math.min(item.quantity + 1, 99) } : item
    )
  );
};

const decrement = (productId: string) => {
  setState((prev) =>
    prev
      .map((item) =>
        item.productId === productId ? { ...item, quantity: Math.max(item.quantity - 1, 0) } : item
      )
      .filter((item) => item.quantity > 0)
  );
};

const removeItem = (productId: string) => {
  setState((prev) => prev.filter((item) => item.productId !== productId));
};

const clearCart = () => {
  setState(() => []);
};

let snapshot: CartStoreSnapshot = createSnapshot(cartState);

function createSnapshot(items: CartItem[]): CartStoreSnapshot {
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = subtotal;
  return {
    items,
    itemCount,
    subtotal,
    total,
    addItem,
    increment,
    decrement,
    removeItem,
    clearCart,
  };
}

function updateSnapshot(nextItems: CartItem[]) {
  snapshot = createSnapshot(nextItems);
}

const cartStateWrapper: { items: CartItem[] } = {
  items: [],
};

function notify(nextItems: CartItem[]) {
  updateSnapshot(nextItems);
  listeners.forEach((listener) => listener());
}

function setState(updater: (prev: CartItem[]) => CartItem[]) {
  const nextItems = updater(cartStateWrapper.items);
  cartStateWrapper.items = nextItems;
  cartState = nextItems;
  notify(nextItems);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CartStoreSnapshot {
  return snapshot;
}

export function useCartStore(): CartStoreSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

useCartStore.getState = () => cartState;
useCartStore.clearListeners = () => listeners.clear();
