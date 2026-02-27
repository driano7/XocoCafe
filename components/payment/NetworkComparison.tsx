'use client';

import { ArrowRightSquare } from 'lucide-react';

type NetworkStat = {
  name: string;
  txCost: string;
  confirmTime: string;
  finality: string;
  pros: string[];
  cons?: string[];
  recommended?: boolean;
};

export const NetworkStats: Record<string, NetworkStat> = {
  arbitrum: {
    name: 'Arbitrum',
    txCost: '$0.05',
    confirmTime: '~15 segundos',
    finality: '1 confirmación',
    pros: ['Alto TVL DeFi', 'Buena liquidez'],
    recommended: true,
  },
  optimism: {
    name: 'Optimism',
    txCost: '$0.10',
    confirmTime: '~10 segundos',
    finality: '1 confirmación',
    pros: ['Superchain', 'OP Stack'],
  },
  zkSync: {
    name: 'zkSync Era',
    txCost: '$0.03',
    confirmTime: '~5 segundos',
    finality: '1 confirmación',
    pros: ['ZK Rollup', 'Alta seguridad'],
  },
  ethereum: {
    name: 'Ethereum',
    txCost: '$3-15',
    confirmTime: '~12 segundos',
    finality: '1-2 confirmaciones',
    pros: ['Máxima seguridad', 'Mayor descentralización'],
    cons: ['Muy caro', 'No recomendado para pagos pequeños'],
  },
  monad: {
    name: 'Monad',
    txCost: '$0.001',
    confirmTime: '<1 segundo',
    finality: 'Instantánea',
    pros: ['Ultra rápido', 'Ultra barato', 'Parallel execution'],
    cons: ['Nuevo (lanzó en Nov 2024)', 'Liquidez en crecimiento'],
  },
};

export function NetworkComparison() {
  return (
    <section className="space-y-6 rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-xl dark:border-gray-800 dark:bg-black/60">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-600">
            Guía rápida
          </p>
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">
            Costos & velocidad
          </h3>
        </div>
        <ArrowRightSquare className="h-5 w-5 text-gray-500" aria-hidden />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(NetworkStats).map(([key, network]) => (
          <article
            key={key}
            className={`space-y-3 rounded-2xl border p-4 transition hover:border-orange-500 dark:border-gray-800 dark:hover:border-orange-400 ${
              network.recommended
                ? 'bg-orange-50/60 border-orange-200 dark:bg-orange-900/40'
                : 'bg-white/60 dark:bg-gray-900/40'
            }`}
          >
            <header className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                {network.name}
              </h4>
              {network.recommended && (
                <span className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1 text-xs font-semibold text-white">
                  Recomendado
                </span>
              )}
            </header>
            <dl className="grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <dt className="font-semibold text-gray-900 dark:text-white">Costo</dt>
                <dd>{network.txCost}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900 dark:text-white">Confirmación</dt>
                <dd>{network.confirmTime}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-900 dark:text-white">Finalidad</dt>
                <dd>{network.finality}</dd>
              </div>
            </dl>
            <div className="space-y-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
              <p>Pros</p>
              <ul className="space-y-1 text-[0.8rem] font-medium text-gray-700 dark:text-gray-200">
                {network.pros.map((pro) => (
                  <li key={pro}>&#9733; {pro}</li>
                ))}
              </ul>
            </div>
            {network.cons && (
              <div className="space-y-1 rounded-xl border border-red-100 bg-red-50/70 p-3 text-[0.75rem] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-100">
                <p>Consideraciones</p>
                <ul className="space-y-1 text-red-800 dark:text-red-200">
                  {network.cons.map((con) => (
                    <li key={con}>• {con}</li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
