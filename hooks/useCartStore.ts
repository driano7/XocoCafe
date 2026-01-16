/*
 * --------------------------------------------------------------------
 *  Xoco Café — Software Property
 *  Copyright (c) 2025 Xoco Café
 *  Principal Developer: Donovan Riaño
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at:
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *  --------------------------------------------------------------------
 *  PROPIEDAD DEL SOFTWARE — XOCO CAFÉ.
 *  Copyright (c) 2025 Xoco Café.
 *  Desarrollador Principal: Donovan Riaño.
 *
 *  Este archivo está licenciado bajo la Apache License 2.0.
 *  Consulta el archivo LICENSE en la raíz del proyecto para más detalles.
 * --------------------------------------------------------------------
 */

'use client';

import { useSyncExternalStore } from 'react';

export type CartCategory = 'beverage' | 'food' | 'package';

export interface CartItem {
  lineId: string;
  productId: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
  category?: CartCategory | null;
  size?: string | null;
  packageItems?: string[] | null;
}

type CartPayload = Omit<CartItem, 'lineId' | 'quantity'>;

interface CartStoreSnapshot {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  total: number;
  addItem: (payload: CartPayload, quantity?: number) => void;
  increment: (lineId: string) => void;
  decrement: (lineId: string) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
  lastActivity: number;
}

let cartState: CartItem[] = [];
let lastActivity = Date.now();

const listeners = new Set<() => void>();

const matchesCartItem = (item: CartItem, payload: CartPayload) => {
  const packageKey = JSON.stringify(item.packageItems ?? []);
  const payloadPackageKey = JSON.stringify(payload.packageItems ?? []);
  return (
    item.productId === payload.productId &&
    (item.size ?? null) === (payload.size ?? null) &&
    (item.category ?? null) === (payload.category ?? null) &&
    packageKey === payloadPackageKey
  );
};

const createLineId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cart-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};

const addItem = (payload: CartPayload, quantity = 1) => {
  setState((prev) => {
    const normalizedQty = Math.max(1, quantity);
    const matchIndex = prev.findIndex((item) => matchesCartItem(item, payload));
    if (matchIndex >= 0) {
      return prev.map((item, index) =>
        index === matchIndex
          ? { ...item, quantity: Math.min(item.quantity + normalizedQty, 99) }
          : item
      );
    }
    return [
      ...prev,
      {
        ...payload,
        lineId: createLineId(),
        quantity: Math.min(normalizedQty, 99),
      },
    ];
  });
};

const increment = (lineId: string) => {
  setState((prev) =>
    prev.map((item) =>
      item.lineId === lineId ? { ...item, quantity: Math.min(item.quantity + 1, 99) } : item
    )
  );
};

const decrement = (lineId: string) => {
  setState((prev) =>
    prev
      .map((item) =>
        item.lineId === lineId ? { ...item, quantity: Math.max(item.quantity - 1, 0) } : item
      )
      .filter((item) => item.quantity > 0)
  );
};

const removeItem = (lineId: string) => {
  setState((prev) => prev.filter((item) => item.lineId !== lineId));
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
    lastActivity,
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
  lastActivity = Date.now();
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
