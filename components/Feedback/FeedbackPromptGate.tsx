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

import { useEffect, useState } from 'react';
import ShareExperienceForm from './ShareExperienceForm';

const PROMPT_FLAG_KEY = 'xoco:feedbackPrompt';
const PROMPT_DISMISSED_KEY = 'xoco:feedbackPromptDismissed';

export default function FeedbackPromptGate() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const shouldShow = sessionStorage.getItem(PROMPT_FLAG_KEY);
    const alreadyDismissed = localStorage.getItem(PROMPT_DISMISSED_KEY);
    if (shouldShow === 'true' && alreadyDismissed !== 'true') {
      setIsOpen(true);
      sessionStorage.removeItem(PROMPT_FLAG_KEY);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full bg-gray-100 px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
          aria-label="Cerrar"
        >
          ✕
        </button>
        <div className="space-y-2 pr-6">
          <p className="text-xs uppercase tracking-[0.35em] text-primary-500">Feedback</p>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Compártenos tu experiencia
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Llegamos a un nuevo hito de inicios de sesión. Cuéntanos cómo podemos mejorar tu visita
            en Xoco Café.
          </p>
        </div>
        <ShareExperienceForm layout="modal" onSubmitted={handleClose} className="pt-4" />
      </div>
    </div>
  );
}
