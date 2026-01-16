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
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/hooks/useCartStore';

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export default function CartTimeoutWatcher() {
  const router = useRouter();
  const { items, lastActivity, clearCart } = useCartStore();

  useEffect(() => {
    if (items.length === 0) return;

    const checkTimeout = () => {
      const now = Date.now();
      if (now - lastActivity >= TIMEOUT_MS) {
        clearCart();
        router.push('/profile');
      }
    };

    const interval = setInterval(checkTimeout, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [items.length, lastActivity, clearCart, router]);

  return null;
}
