'use client';

import { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import usePaletteOptions from './usePaletteOptions';

interface CommandPaletteOption {
  id: string;
  name: string;
  description?: string;
  hotkey?: string;
  icon?: ReactNode;
  onSelect: (value: string) => void;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const { pageOptions, blogOptions, generalOptions } = usePaletteOptions();

  const sections = useMemo(
    () =>
      [
        { title: 'Navegación', options: pageOptions },
        { title: 'Blog', options: blogOptions },
        { title: 'General', options: generalOptions },
      ].filter((section) => section.options.length > 0),
    [blogOptions, generalOptions, pageOptions]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((current) => !current);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-gray-400">
            Comandos rápidos
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-xs font-semibold uppercase tracking-[0.35em] text-primary-600 hover:text-primary-800 dark:text-primary-300"
          >
            Cerrar
          </button>
        </div>
        <div className="max-h-[420px] overflow-y-auto px-4 py-3 text-sm">
          {sections.map((section) => (
            <div key={section.title} className="mb-4 last:mb-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.options.map((option: CommandPaletteOption) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => {
                        option.onSelect(option.id);
                        setIsOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition hover:bg-primary-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        {option.icon ? (
                          <span className="text-primary-500 dark:text-primary-300">
                            {option.icon}
                          </span>
                        ) : null}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{option.name}</p>
                          {option.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {option.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {option.hotkey && (
                        <span className="rounded-md border border-gray-200 px-2 py-0.5 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-300">
                          {option.hotkey}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
