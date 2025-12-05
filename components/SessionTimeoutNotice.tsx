'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CONTEXT_COPY: Record<string, { title: string; message: string }> = {
  orders: {
    title: 'Creación de pedidos bloqueada',
    message:
      'Necesitas una sesión activa para crear pedidos. Si tu sesión expiró por inactividad, vuelve a iniciar e inténtalo de nuevo.',
  },
  reservations: {
    title: 'Reservaciones deshabilitadas temporalmente',
    message:
      'Por seguridad, las reservaciones solo se muestran cuando tienes una sesión activa. Inicia sesión otra vez para continuar.',
  },
  profile: {
    title: 'Tu sesión expiró',
    message:
      'Detuvimos la edición del perfil porque tu sesión se cerró automáticamente al detectar inactividad.',
  },
  default: {
    title: 'Sesión cerrada',
    message: 'Tu sesión se cerró automáticamente. Te regresaremos al inicio en unos segundos.',
  },
};

type SessionContext = 'orders' | 'reservations' | 'profile' | 'default';

interface SessionTimeoutNoticeProps {
  context?: SessionContext;
  redirectDelayMs?: number;
}

export default function SessionTimeoutNotice({
  context = 'default',
  redirectDelayMs = 0,
}: SessionTimeoutNoticeProps) {
  const router = useRouter();
  const copy = CONTEXT_COPY[context] ?? CONTEXT_COPY.default;
  const shouldAutoRedirect = Boolean(redirectDelayMs && redirectDelayMs > 0);

  useEffect(() => {
    if (!shouldAutoRedirect) return undefined;
    const timeout = setTimeout(() => {
      router.replace('/');
    }, redirectDelayMs);
    return () => clearTimeout(timeout);
  }, [redirectDelayMs, router, shouldAutoRedirect]);

  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.35em] text-primary-500">Sesión expirada</p>
      <h1 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">{copy.title}</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{copy.message}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {shouldAutoRedirect
          ? 'Te enviaremos automáticamente al inicio. Si prefieres hacerlo ahora, usa el botón.'
          : 'Permanece en esta página y usa el botón cuando quieras volver al inicio.'}
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
