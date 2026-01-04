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

import classNames from 'classnames';
import type { SnackbarState, SnackbarTone } from '@/hooks/useSnackbarNotifications';

const toneClasses: Record<SnackbarTone, string> = {
  info: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
  success: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-gray-900',
  warning: 'bg-amber-500 text-gray-900 dark:bg-amber-400 dark:text-slate-900',
  error: 'bg-red-600 text-white dark:bg-red-500 dark:text-white',
  ticket: 'snackbar-ticket',
  profile: 'snackbar-profile',
  whatsapp: 'snackbar-whatsapp',
};

interface SnackbarProps {
  snackbar: SnackbarState | null;
  onDismiss?: () => void;
}

export default function Snackbar({ snackbar, onDismiss }: SnackbarProps) {
  if (!snackbar) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[112px] z-[100] flex justify-center px-4 backdrop-blur-lg">
      <div
        className={classNames(
          'pointer-events-auto flex max-w-md items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold shadow-2xl ring-1 ring-black/10 dark:ring-white/10',
          toneClasses[snackbar.tone]
        )}
        role="status"
        aria-live="polite"
      >
        <span className="flex-1 tracking-tight">{snackbar.message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-base font-semibold text-white transition hover:bg-white/30 dark:bg-black/20 dark:text-slate-900 dark:hover:bg-black/30"
          aria-label="Cerrar notificación"
        >
          ×
        </button>
      </div>
    </div>
  );
}
