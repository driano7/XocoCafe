'use client';

import { useEffect, useState } from 'react';

interface Props {
  coffees: number;
  goal: number;
}

export default function AddToGoogleWalletButton({ coffees, goal }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') {
      return;
    }
    const agent = navigator.userAgent || navigator.vendor || '';
    setIsAndroid(/android/i.test(agent));
  }, []);

  if (!isAndroid) {
    return null;
  }

  const handleAddToWallet = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/wallet/loyalty', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Error al generar tarjeta');
      }

      window.open(data.walletUrl, '_blank');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al generar tarjeta';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <button
        onClick={handleAddToWallet}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-gray-200 bg-white px-5 py-3 font-semibold text-gray-800 shadow-md transition hover:shadow-lg disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      >
        {loading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
            <path
              d="M21.5 12c0 5.247-4.253 9.5-9.5 9.5S2.5 17.247 2.5 12 6.753 2.5 12 2.5s9.5 4.253 9.5 9.5z"
              fill="#4285F4"
            />
            <path d="M12 7v5l3 3" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
        <span className="text-sm">
          {loading ? 'Generando tarjeta...' : 'Agregar a Google Wallet'}
        </span>
        <img
          src="https://wallet.google/static/media/Badge-dark.svg"
          alt="Google Wallet"
          width={80}
          height={24}
          className="ml-auto block"
        />
      </button>

      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        Disponible para dispositivos Android con Google Wallet
      </p>
      <p className="text-center text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
        {`${coffees} / ${goal} cafés registrados`}
      </p>
    </div>
  );
}
