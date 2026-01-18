'use client';

import Image from 'next/image';
import classNames from 'classnames';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/components/Language/LanguageProvider';

interface LoyaltyProgressCardProps {
  coffees?: number | null;
  goal?: number;
  orders?: number | null;
  totalInteractions?: number | null;
  customerName?: string | null;
  isLoading?: boolean;
  className?: string;
  qrUrl?: string | null;
  clientId?: string | null;
}

const RAW_TARGET = Number(process.env.NEXT_PUBLIC_LOYALTY_TARGET ?? 7);
const DEFAULT_TARGET = Number.isFinite(RAW_TARGET) && RAW_TARGET > 0 ? Math.floor(RAW_TARGET) : 7;

export default function LoyaltyProgressCard({
  coffees = 0,
  goal = DEFAULT_TARGET,
  orders,
  totalInteractions,
  customerName,
  isLoading,
  className,
  qrUrl,
  clientId,
}: LoyaltyProgressCardProps) {
  const { t } = useLanguage();
  const normalized = Math.max(0, Math.min(goal, Math.floor(coffees ?? 0)));
  const progressPercent = useMemo(
    () => Math.min(100, Math.round((normalized / goal) * 100)),
    [normalized, goal]
  );
  const [animate, setAnimate] = useState(false);
  const previousCount = useRef(normalized);

  useEffect(() => {
    if (normalized > previousCount.current) {
      setAnimate(true);
      const timeout = setTimeout(() => setAnimate(false), 800);
      previousCount.current = normalized;
      return () => clearTimeout(timeout);
    }
    previousCount.current = normalized;
    return undefined;
  }, [normalized]);

  const cupItems = useMemo(() => Array.from({ length: goal }), [goal]);

  return (
    <section
      className={classNames(
        'rounded-3xl border border-primary-100/70 bg-gradient-to-br from-[#5c3025] via-[#7d4a30] to-[#b46f3c] p-5 text-white shadow-2xl dark:border-white/10',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-white/80">
            {t('loyalty.program_label') || 'Programa de lealtad'}
          </p>
          <h3 className="text-2xl font-semibold">
            {customerName?.trim() || t('orders.client') || 'Cliente'}
          </h3>
          <p className="text-xs text-white/75">
            {t('loyalty.stamps_label') || 'Sello por cada bebida registrada'}
          </p>
        </div>
        <div
          className={classNames(
            'relative flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-center text-sm font-semibold',
            animate && 'ring-4 ring-white/70'
          )}
          style={{
            backgroundImage: `conic-gradient(rgba(255,255,255,0.8) ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
          }}
        >
          <div className="absolute inset-[6px] rounded-full bg-[#5c3025] text-white">
            <div className="flex h-full w-full flex-col items-center justify-center">
              <span className="text-xl font-bold">{isLoading ? '–' : normalized}</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/70">
                / {goal}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2 text-base font-semibold">
        {cupItems.map((_, index) => {
          const isFilled = index < normalized;
          return (
            <div
              key={index}
              className={classNames(
                'flex h-8 items-center justify-center rounded-full border-2 border-white/60 text-xs transition-transform duration-300',
                isFilled ? 'bg-white text-[#5c3025] shadow-lg' : 'bg-white/10 text-white/70',
                animate && isFilled && index === normalized - 1 && 'scale-110'
              )}
            >
              {isFilled ? '☕' : index + 1}
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-1 text-center text-xs uppercase tracking-[0.3em] text-white/80 sm:hidden">
        <p className="text-[10px] text-white/60">
          {t('loyalty.orders_registered') || 'Pedidos registrados'} /{' '}
          {t('loyalty.total_interactions') || 'Interacciones totales'}
        </p>
        <p className="text-lg font-semibold">{`${orders ?? '—'} / ${totalInteractions ?? '—'}`}</p>
      </div>
      <div className="mt-4 hidden gap-2 text-xs uppercase tracking-[0.2em] text-white/80 sm:grid sm:grid-cols-2">
        <div>
          <p className="text-[10px] text-white/60">
            {t('loyalty.orders_registered') || 'Pedidos registrados'}
          </p>
          <p className="text-lg font-semibold">{orders ?? '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/60">
            {t('loyalty.total_interactions') || 'Interacciones totales'}
          </p>
          <p className="text-lg font-semibold">{totalInteractions ?? '—'}</p>
        </div>
      </div>

      {qrUrl && clientId && (
        <div className="mt-6 flex flex-col items-center gap-3 text-center text-white/85">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em]">
            {t('loyalty.qr_scan_notice') ||
              'Escanea este código para identificar tu cuenta rápidamente en sucursal.'}
          </p>
          <Image
            src={qrUrl}
            alt={`QR del cliente ${clientId}`}
            width={220}
            height={220}
            className="h-48 w-48 rounded-2xl border border-white/60 bg-white/95 p-2 shadow-lg"
          />
          <p className="text-xs font-semibold uppercase tracking-[0.35em]">
            {t('loyalty.id_label') || 'ID'} ·{' '}
            <span className="underline decoration-white/70">{clientId}</span>
          </p>
        </div>
      )}

      <p className="mt-4 text-[11px] text-white/70">
        {normalized >= goal ? (
          t('loyalty.stamps_complete') ||
          '¡Llevas los sellos completos! Canjea tu bebida en barra para reiniciar tu cuenta.'
        ) : (
          <span className="underline decoration-white/80 underline-offset-4">
            {(
              t('loyalty.stamps_missing') ||
              'Te faltan {count} {label} para el Americano en cortesía.'
            )
              .replace('{count}', String(goal - normalized))
              .replace(
                '{label}',
                goal - normalized === 1
                  ? t('loyalty.stamp') || 'sello'
                  : t('loyalty.stamps') || 'sellos'
              )}
          </span>
        )}
      </p>
    </section>
  );
}
