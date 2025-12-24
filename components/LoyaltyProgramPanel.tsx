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
 *  PROPIEDAD DEL SOFTWARE — XOCO CAFÉ.
 *  Copyright (c) 2025 Xoco Café.
 *  Desarrollador Principal: Donovan Riaño.
 *
 *  Este archivo está licenciado bajo la Apache License 2.0.
 *  Consulta el archivo LICENSE en la raíz del proyecto para más detalles.
 * --------------------------------------------------------------------
 */

'use client';

import clsx from 'clsx';

type ReminderAlert = { type: 'success' | 'error'; message: string };

type LoyaltyProgramPanelProps = {
  stamps: number;
  customerName?: string | null;
  ordersCount?: number | null;
  interactionsCount?: number | null;
  reminderAlert?: ReminderAlert | null;
  showReminderCard?: boolean;
  onActivateReminder?: () => void;
  isActivatingReminder?: boolean;
  showFlipCard?: boolean;
  className?: string;
  as?: 'section' | 'div';
};

const STAMP_TARGET = 7;

const buildStampArray = (count: number) =>
  Array.from({ length: STAMP_TARGET }).map((_, index) => index < count);

export default function LoyaltyProgramPanel({
  stamps,
  customerName,
  ordersCount = null,
  interactionsCount = null,
  reminderAlert = null,
  showReminderCard = false,
  onActivateReminder,
  isActivatingReminder = false,
  className = '',
  as = 'section',
}: LoyaltyProgramPanelProps) {
  const Container = as === 'div' ? 'div' : 'section';
  const normalizedStamps = Math.max(0, Math.min(STAMP_TARGET, stamps));
  const remaining = Math.max(0, STAMP_TARGET - normalizedStamps);
  const stampList = buildStampArray(normalizedStamps);
  const progressPercent = Math.round((normalizedStamps / STAMP_TARGET) * 100);

  return (
    <Container
      className={clsx(
        'relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#1d2337] via-[#262035] to-[#3e1f25] p-6 text-white shadow-[0_25px_60px_rgba(12,11,15,0.7)]',
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
          Programa semanal
        </p>
        <h3 className="text-2xl font-bold text-white">{customerName ?? 'Cliente Xoco Café'}</h3>
        <p className="text-sm text-white/70">Sello por cada bebida registrada.</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-6">
        <div className="relative h-24 w-24">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <circle cx="50" cy="50" r="45" className="fill-none stroke-white/10" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="45"
              className="fill-none stroke-white"
              strokeWidth="8"
              strokeDasharray={`${(progressPercent / 100) * 2 * Math.PI * 45} ${2 * Math.PI * 45}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-2xl font-bold">{normalizedStamps}</p>
            <p className="text-xs text-white/70">de 7</p>
          </div>
        </div>
        <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Pedidos registrados</p>
          <p className="text-xl font-semibold text-white">{ordersCount ?? '—'}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.3em] text-white/60">
            Interacciones totales
          </p>
          <p className="text-xl font-semibold text-white">{interactionsCount ?? '—'}</p>
          <p className="mt-3 text-xs text-white/60">
            {remaining === 0
              ? 'Canjea tu bebida mostrando tu QR en barra.'
              : `Te faltan ${remaining} sellos para la bebida de cortesía.`}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          {stampList.map((filled, index) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={`${index}-${filled}`}
              className={clsx(
                'inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold',
                filled ? 'border-white bg-white text-[#2b1f2a]' : 'border-white/30 text-white/50'
              )}
            >
              {filled ? index + 1 : index + 1}
            </span>
          ))}
        </div>
        <div className="text-right text-xs text-white/70">
          <p>Sellos completados</p>
          <p className="text-sm font-semibold text-white">{normalizedStamps}/7</p>
        </div>
      </div>

      {reminderAlert && (
        <div
          className={clsx(
            'mt-4 rounded-full px-4 py-2 text-sm font-semibold',
            reminderAlert.type === 'success'
              ? 'bg-green-100/90 text-green-900 dark:bg-green-900/30 dark:text-green-200'
              : 'bg-red-100/90 text-red-900 dark:bg-red-900/30 dark:text-red-200'
          )}
        >
          {reminderAlert.message}
        </div>
      )}

      {showReminderCard && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
          <div>
            <p className="font-semibold text-white">Recordatorio activo</p>
            <p className="text-white/70">Te avisamos antes de que caduquen tus sellos.</p>
          </div>
          <button
            type="button"
            onClick={onActivateReminder}
            disabled={isActivatingReminder}
            className="rounded-full bg-white/90 px-6 py-2 text-sm font-semibold text-[#2b1f2a] shadow hover:bg-white disabled:opacity-60"
          >
            {isActivatingReminder ? 'Activando…' : 'Activar recordatorio'}
          </button>
        </div>
      )}
    </Container>
  );
}
