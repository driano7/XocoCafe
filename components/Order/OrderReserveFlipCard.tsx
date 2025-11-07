'use client';

import { useState } from 'react';

interface OrderReserveFlipCardProps {
  variant?: 'order' | 'reserve';
  className?: string;
}

const FRONT_COPY = {
  order: {
    eyebrow: 'Pedidos en línea',
    title: 'Consejo rápido',
    message:
      'Agrega tus bebidas favoritas en un solo clic y confirma tu orden cuando estés listo. Recibirás una notificación cuando el barista la acepte.',
  },
  reserve: {
    eyebrow: 'Reservaciones',
    title: 'Antes de reservar',
    message:
      'Selecciona la fecha y hora ideales. Recibirás un código único para presentarlo en anfitriones al llegar.',
  },
} as const;

const BACK_COPY = {
  order: {
    title: 'Recoge sin filas',
    message:
      'Cuando veas tu pedido como “pendiente” en el panel, significa que lo estamos preparando. Muéstrale tu ticket digital al llegar para recogerlo al instante.',
  },
  reserve: {
    title: 'Confirma tu mesa',
    message:
      'El equipo te contactará si requiere ajustes en la reservación. Mientras tanto, puedes compartir el código con tus invitados.',
  },
} as const;

export default function OrderReserveFlipCard({
  variant = 'order',
  className = '',
}: OrderReserveFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const front = FRONT_COPY[variant];
  const back = BACK_COPY[variant];

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative h-44 w-full cursor-pointer transition-transform duration-700 transform-style-preserve-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={() => setIsFlipped((value) => !value)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsFlipped((value) => !value);
          }
        }}
        aria-pressed={isFlipped}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className={`absolute inset-0 backface-hidden rounded-2xl border border-primary-100 bg-white p-5 shadow-md dark:border-primary-900/40 dark:bg-gray-900 ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <p className="text-xs uppercase tracking-[0.35em] text-primary-500">{front.eyebrow}</p>
          <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
            {front.title}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{front.message}</p>
          <span className="mt-4 inline-flex items-center text-xs font-semibold text-primary-600">
            Toca para ver más →
          </span>
        </div>

        <div
          className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 p-5 text-white shadow-lg"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <h3 className="text-xl font-semibold">{back.title}</h3>
          <p className="mt-2 text-sm text-white/90">{back.message}</p>
          <span className="mt-4 inline-flex items-center text-xs font-semibold text-white/80">
            ← Volver
          </span>
        </div>
      </div>
    </div>
  );
}
