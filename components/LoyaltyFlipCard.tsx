'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './Auth/AuthProvider';

interface LoyaltyFlipCardProps {
  className?: string;
}

interface CoffeeCountResult {
  success: boolean;
  data: {
    weeklyCoffeeCount: number;
    rewardEarned?: boolean;
    message?: string | null;
  };
}

export default function LoyaltyFlipCard({ className = '' }: LoyaltyFlipCardProps) {
  const { user, token } = useAuth();
  const [isFlipped, setIsFlipped] = useState(false);
  const [coffeeCount, setCoffeeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [recentlyStamped, setRecentlyStamped] = useState<number | null>(null);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);
  const hideCongratsTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user?.weeklyCoffeeCount !== undefined) {
      setCoffeeCount(user.weeklyCoffeeCount);
    }
  }, [user]);

  const fetchCoffeeCount = useCallback(async () => {
    if (!token) return;
    setLoyaltyError(null);
    try {
      const response = await fetch('/api/user/coffee-count', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });
      const payload = (await response.json()) as CoffeeCountResult;
      if (!payload?.success) {
        throw new Error(payload?.data?.message || 'No pudimos obtener tu progreso.');
      }
      if (typeof payload.data?.weeklyCoffeeCount === 'number') {
        setCoffeeCount(payload.data.weeklyCoffeeCount);
      }
    } catch (error) {
      console.error('Error cargando contador de cafés:', error);
      setLoyaltyError('No pudimos cargar tu progreso de lealtad. Intenta más tarde.');
    }
  }, [token]);

  useEffect(() => {
    void fetchCoffeeCount();
  }, [fetchCoffeeCount]);

  useEffect(() => {
    if (recentlyStamped !== null) {
      const timeout = setTimeout(() => setRecentlyStamped(null), 600);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [recentlyStamped]);

  useEffect(() => {
    return () => {
      if (hideCongratsTimeout.current) clearTimeout(hideCongratsTimeout.current);
    };
  }, []);

  const handleCardClick = () => {
    setIsFlipped((state) => !state);
  };

  const incrementCoffeeCount = async (increment: number): Promise<CoffeeCountResult | null> => {
    if (!token) {
      setLoyaltyError('Inicia sesión para sumar sellos.');
      return null;
    }
    try {
      const response = await fetch('/api/user/coffee-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ increment }),
      });
      const payload = (await response.json()) as CoffeeCountResult;
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.data?.message || 'No pudimos actualizar tu progreso.');
      }
      return payload;
    } catch (error) {
      console.error('Error incrementando contador:', error);
      setLoyaltyError('No pudimos registrar el sello. Revisa tu conexión e inténtalo de nuevo.');
      return null;
    }
  };

  const handleCoffeeClick = async () => {
    if (coffeeCount >= 7 || isLoading) return;

    setIsLoading(true);
    setLoyaltyError(null);
    try {
      const firstStep = await incrementCoffeeCount(1);
      if (!firstStep?.success) return;

      const updatedCount = firstStep.data.weeklyCoffeeCount;
      setCoffeeCount(updatedCount);

      if (firstStep.data.rewardEarned) {
        setShowCongrats(true);
        if (hideCongratsTimeout.current) clearTimeout(hideCongratsTimeout.current);
        hideCongratsTimeout.current = setTimeout(() => setShowCongrats(false), 4000);
        setRecentlyStamped(null);
      } else {
        setRecentlyStamped(Math.max(0, updatedCount - 1));
      }
      await fetchCoffeeCount();
    } finally {
      setIsLoading(false);
    }
  };

  const frontCard = (
    <div className="flex h-full w-full flex-col rounded-2xl bg-[#f8f1e4] p-6 shadow-xl text-[#5c3025]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5c3025]">
            <Image
              src="/static/images/Xoco.jpeg"
              alt="Logotipo Xoco Café"
              width={48}
              height={48}
              className="h-full w-full rounded-full object-cover"
              priority
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#5c3025]">
              Xoco Café
            </p>
            <p className="text-[11px] text-[#8b5a3c]">
              Café artesanal inspirado en el cacao mexicano
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[#e4c9a8] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#5c3025]">
          Frecuente
        </span>
      </div>

      <div className="mt-6 space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">📞</span>
          <span className="font-medium">
            {user?.phone && user.phone.trim().length > 0 ? user.phone : 'Actualiza tu teléfono'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">✉️</span>
          <span className="break-all font-medium">{user?.email || 'correo@xococafe.com'}</span>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-[#e4c9a8] bg-white/85 px-4 py-3 text-xs uppercase tracking-[0.35em] text-[#5c3025] shadow-inner">
        ID Cliente · {user?.clientId || '---'}
      </div>

      <p className="mt-auto pt-6 text-[11px] text-[#8b5a3c]">
        <span className="font-semibold underline">
          Toca la tarjeta para conocer tu progreso de lealtad
        </span>
      </p>
    </div>
  );

  const backCard = (
    <div className="flex h-full w-full flex-col items-center rounded-2xl bg-gradient-to-br from-[#5c3025] via-[#7d4a30] to-[#b46f3c] p-6 text-white shadow-xl">
      <h3 className="mb-6 text-xl font-semibold uppercase tracking-widest">Programa de lealtad</h3>

      <div className="mb-5 grid grid-cols-7 gap-3">
        {Array.from({ length: 7 }, (_, index) => {
          const isFilled = index < coffeeCount;
          const isNext = index === coffeeCount;
          return (
            <button
              type="button"
              key={index}
              onClick={(event) => {
                event.stopPropagation();
                if (isNext && !isLoading && coffeeCount < 7) {
                  void handleCoffeeClick();
                }
              }}
              disabled={!isNext || isLoading || coffeeCount >= 7}
              className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/70 transition-transform duration-300 ${
                isFilled ? 'bg-white text-[#5c3025] shadow-lg' : 'bg-white/10 text-white opacity-80'
              } ${isNext && coffeeCount < 7 ? 'hover:scale-105 focus:scale-105' : ''}`}
            >
              {isFilled ? '☕' : index + 1}
              {recentlyStamped === index && (
                <span className="absolute inset-0 rounded-full border-2 border-white/80 opacity-75 animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      <div className="text-center text-sm">
        <p className="font-semibold">
          {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Cliente'}
        </p>
        <p className="text-xs opacity-80">{user?.clientId || 'ID pendiente'}</p>
        <p className="mt-2 text-[11px] opacity-70">
          Completa 6 sellos y el séptimo americano va por nuestra cuenta.
        </p>
      </div>

      <p className="mt-5 text-xs uppercase tracking-widest opacity-80">
        Toca el siguiente sello para avanzar
      </p>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {showCongrats && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-black/60">
          <div className="animate-bounce rounded-xl bg-white px-6 py-5 text-center shadow-xl">
            <div className="mb-2 text-4xl">🎉</div>
            <h3 className="mb-1 text-xl font-bold text-[#5c3025]">¡Felicidades!</h3>
            <p className="text-sm text-[#7d4a30]">Has desbloqueado un Americano gratis.</p>
          </div>
        </div>
      )}

      <div
        className={`relative h-72 w-full cursor-pointer transition-transform duration-700 transform-style-preserve-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={handleCardClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCardClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-pressed={isFlipped}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className={`absolute inset-0 backface-hidden ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {frontCard}
        </div>

        <div
          className={`absolute inset-0 backface-hidden rotate-y-180 ${
            isFlipped ? '' : 'rotate-y-180'
          }`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {backCard}
        </div>
      </div>

      <p className="mt-3 text-center text-sm text-gray-600">Toca la tarjeta para voltear</p>
      {loyaltyError && (
        <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">{loyaltyError}</p>
      )}
    </div>
  );
}
