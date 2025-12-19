'use client';

import classNames from 'classnames';
import type { TicketOrderSnapshot, TicketRecord } from '@/hooks/useTicketDetails';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  cripto: 'Cripto',
  tarjeta: 'Tarjeta',
  stripe: 'Tarjeta',
  cashapp: 'Cash App',
  lightning: 'Lightning',
};

const PAYMENT_REFERENCE_TYPE_LABELS: Record<string, string> = {
  evm_address: 'Wallet 0x',
  ens_name: 'ENS',
  lightning_invoice: 'Lightning',
  transaction_id: 'Transferencia',
  text: 'Referencia',
};

const abbreviateStaffId = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.includes('@')) {
    return trimmed.split('@')[0];
  }
  const parts = trimmed.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) {
    return trimmed;
  }
  if (parts.length === 1) {
    return parts[0].substring(0, 8);
  }
  return `${parts[0]} ${parts[1].charAt(0)}.`;
};

const resolveMethodLabel = (value?: string | null) => {
  if (!value) {
    return 'Sin método';
  }
  const normalized = value.trim().toLowerCase();
  return PAYMENT_METHOD_LABELS[normalized] ?? value;
};

const resolveReferenceBadge = (value?: string | null) => {
  if (!value) {
    return null;
  }
  return PAYMENT_REFERENCE_TYPE_LABELS[value] ?? null;
};

const resolveHandler = (ticket?: TicketRecord | null, order?: TicketOrderSnapshot | null) => {
  return (
    ticket?.handledByStaffName ??
    order?.queuedByStaffName ??
    abbreviateStaffId(ticket?.handledByStaffId ?? order?.queuedByStaffId) ??
    null
  );
};

interface TicketAssignmentNoticeProps {
  ticket?: TicketRecord | null;
  order?: TicketOrderSnapshot | null;
  isLoading?: boolean;
  className?: string;
}

export function TicketAssignmentNotice({
  ticket,
  order,
  isLoading,
  className,
}: TicketAssignmentNoticeProps) {
  const handler = resolveHandler(ticket, order);
  const methodLabel = resolveMethodLabel(ticket?.paymentMethod ?? order?.queuedPaymentMethod);
  const reference = ticket?.paymentReference ?? order?.queuedPaymentReference;
  const referenceBadge = resolveReferenceBadge(
    ticket?.paymentReferenceType ?? order?.queuedPaymentReferenceType ?? undefined
  );

  return (
    <section
      className={classNames(
        'rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
        className
      )}
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700 dark:text-amber-100">
        En preparación
      </p>
      <div className="mt-2 space-y-1">
        <p>
          <span className="font-semibold">Atendió: </span>
          {isLoading ? 'Consultando...' : handler ?? 'Aún no se asigna'}
        </p>
        <p>
          <span className="font-semibold">Método: </span>
          {isLoading ? '---' : methodLabel}
        </p>
        {reference ? (
          <p className="text-xs">
            <span className="font-semibold">Referencia:</span> {reference}{' '}
            {referenceBadge && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-[2px] text-[10px] uppercase tracking-[0.2em] text-amber-700 dark:bg-amber-400/20 dark:text-amber-100">
                {referenceBadge}
              </span>
            )}
          </p>
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-100/80">Sin referencia capturada.</p>
        )}
      </div>
    </section>
  );
}
