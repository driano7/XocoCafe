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
