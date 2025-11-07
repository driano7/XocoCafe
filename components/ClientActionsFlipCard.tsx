'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Playfair_Display } from 'next/font/google';
import clsx from 'clsx';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600'],
});

interface ClientActionsFlipCardProps {
  className?: string;
}

export default function ClientActionsFlipCard({ className = '' }: ClientActionsFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const toggleFlip = () => setIsFlipped((value) => !value);

  const FlipButton = ({ variant }: { variant: 'light' | 'dark' }) => (
    <button
      type="button"
      aria-label="Girar tarjeta"
      onClick={(event) => {
        event.stopPropagation();
        toggleFlip();
      }}
      className={clsx(
        'rounded-full p-2 text-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        variant === 'light'
          ? 'border border-primary-200 bg-primary-50 text-primary-600 hover:bg-primary-100 focus-visible:outline-primary-400'
          : 'border border-white/40 bg-white/20 text-white hover:bg-white/40 focus-visible:outline-white'
      )}
    >
      <span aria-hidden="true" className="leading-none">
        ↻
      </span>
    </button>
  );

  const frontFace = (
    <div className="flex h-full flex-col justify-between rounded-2xl bg-white/90 p-6 text-primary-700 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-primary-400">Servicio rápido</p>
          <h3
            className={clsx(
              'mt-2 text-3xl font-semibold text-primary-700',
              playfair.className,
              'leading-snug'
            )}
          >
            Pide Online y Recoge
          </h3>
          <p className="mt-3 text-sm text-primary-500">
            Haz tu pedido desde la app y recógelo en barra sin hacer fila.
          </p>
        </div>
        <FlipButton variant="light" />
      </div>

      <Link
        href="/order"
        className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      >
        Empezar Pedido
        <span aria-hidden="true" className="ml-2">
          →
        </span>
      </Link>
    </div>
  );

  const backFace = (
    <div className="flex h-full flex-col justify-between rounded-2xl bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 p-6 text-white shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">
            Atención personalizada
          </p>
          <h3
            className={clsx(
              'mt-2 text-3xl font-semibold text-white',
              playfair.className,
              'leading-snug'
            )}
          >
            Haz una Reservación
          </h3>
          <p className="mt-3 text-sm text-white/80">
            Asegura tu mesa favorita para tu próxima visita a Xoco Café.
          </p>
        </div>
        <FlipButton variant="dark" />
      </div>

      <Link
        href="/reserve"
        className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary-700 shadow-lg transition hover:bg-primary-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Reservar Mesa
        <span aria-hidden="true" className="ml-2 text-primary-500">
          ↺
        </span>
      </Link>
    </div>
  );

  return (
    <div className={clsx('relative', className)}>
      <div
        className={clsx(
          'relative h-56 w-full cursor-pointer transition-transform duration-700',
          'transform-style-preserve-3d',
          isFlipped ? 'rotate-y-180' : ''
        )}
        onClick={toggleFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleFlip();
          }
        }}
        aria-pressed={isFlipped}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className={clsx('absolute inset-0 backface-hidden', isFlipped ? 'rotate-y-180' : '')}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {frontFace}
        </div>
        <div
          className={clsx(
            'absolute inset-0 backface-hidden rotate-y-180',
            isFlipped ? '' : 'rotate-y-180'
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {backFace}
        </div>
      </div>
    </div>
  );
}
