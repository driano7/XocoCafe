'use client';

import { useMemo } from 'react';
import { useAvailability } from '@/hooks/useAvailability';

interface AvailabilitySnackbarProps {
  cartItems: Array<{ productId: string; name: string }>;
}

export default function AvailabilitySnackbar({ cartItems }: AvailabilitySnackbarProps) {
  const { availabilityData, isLoading } = useAvailability({
    enabled: true,
    pollingIntervalMs: 60_000, // 1 minuto
  });

  // Encontrar productos en el carrito con baja o nula disponibilidad
  const unavailableItems = useMemo(() => {
    if (!availabilityData || isLoading) return [];

    // Crear mapa de disponibilidad para búsqueda rápida
    const availabilityMap = new Map<string, any>();

    [
      ...availabilityData.beverage.items,
      ...availabilityData.food.items,
      ...availabilityData.package.items,
    ].forEach((item) => {
      availabilityMap.set(item.productId, item);
    });

    return cartItems
      .map((cartItem) => {
        const availability = availabilityMap.get(cartItem.productId);
        if (!availability) return null;

        if (
          availability.availabilityStatus === 'unavailable' ||
          availability.availabilityStatus === 'low_stock'
        ) {
          return {
            ...cartItem,
            availabilityStatus: availability.availabilityStatus,
            reason: availability.reason,
          };
        }

        return null;
      })
      .filter(Boolean) as Array<{
      productId: string;
      name: string;
      availabilityStatus: 'low_stock' | 'unavailable';
      reason?: string | null;
    }>;
  }, [availabilityData, cartItems, isLoading]);

  // No mostrar nada si está cargando o no hay productos con problemas de disponibilidad
  if (isLoading || unavailableItems.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 space-y-2">
      <div className="max-w-4xl mx-auto">
        {unavailableItems.map((item, index) => (
          <div
            key={`${item.productId}-${index}`}
            className="relative overflow-hidden rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl"
            style={{
              background:
                'linear-gradient(135deg, #ec4899 0%, #a855f7 25%, #6366f1 50%, #8b5cf6 75%, #d946ef 100%)',
            }}
          >
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative px-4 py-3 text-white">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {item.availabilityStatus === 'unavailable' ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.availabilityStatus === 'unavailable'
                      ? 'Sin disponibilidad'
                      : 'Poca disponibilidad'}
                  </p>
                  <p className="text-xs opacity-90 truncate">
                    {item.name}
                    {item.reason && ` - ${item.reason}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
