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

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { MenuItem } from '@/lib/menuData';

interface SearchableDropdownProps {
  id: string;
  label: string;
  options: MenuItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  allowClear?: boolean;
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function humanizeFromId(id: string) {
  return id
    .replace(/^(beverage|food|package)-/, '')
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatOptionLabel(option: MenuItem) {
  const rawLabel = option.label?.trim() ?? '';
  if (rawLabel && !/^\$/.test(rawLabel)) {
    return rawLabel;
  }
  return humanizeFromId(option.id);
}

export default function SearchableDropdown({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  helperText,
  allowClear = true,
}: SearchableDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const normalizedQuery = normalize(query);

  const sortedOptions = useMemo(
    () =>
      [...options].sort((a, b) =>
        formatOptionLabel(a).localeCompare(formatOptionLabel(b), 'es', { sensitivity: 'base' })
      ),
    [options]
  );

  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return sortedOptions;
    return sortedOptions.filter((option) =>
      normalize(formatOptionLabel(option)).includes(normalizedQuery)
    );
  }, [sortedOptions, normalizedQuery]);

  const selectedOption = options.find((option) => option.id === value) ?? null;

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    closeDropdown();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDropdown();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => {
        const nextIndex = prev + 1;
        return nextIndex >= filteredOptions.length ? filteredOptions.length - 1 : nextIndex;
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => {
        const nextIndex = prev - 1;
        return nextIndex < 0 ? 0 : nextIndex;
      });
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) {
        handleSelect(option.id);
      }
    }
  };

  useEffect(() => {
    if (!isOpen || activeIndex < 0 || !listRef.current) return;
    const optionNodes = listRef.current.querySelectorAll<HTMLButtonElement>('[data-option]');
    const activeNode = optionNodes[activeIndex];
    activeNode?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  return (
    <div ref={containerRef} className="relative z-20 overflow-visible">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        {label}
      </label>
      <div className="relative">
        <button
          id={id}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          onKeyDown={handleKeyDown}
          className="w-full flex justify-between items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <span>{selectedOption ? formatOptionLabel(selectedOption) : placeholder}</span>
          <svg
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {isOpen && (
          <div
            className="absolute z-50 mt-2 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
            role="listbox"
            aria-labelledby={id}
          >
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                ref={inputRef}
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Buscar..."
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
              />
            </div>

            <div
              ref={listRef}
              className="max-h-64 overflow-y-auto overscroll-contain p-1 touch-pan-y"
              onKeyDown={handleListKeyDown}
              role="presentation"
              tabIndex={-1}
            >
              {filteredOptions.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No hay resultados para “{query}”.
                </p>
              )}

              {allowClear && selectedOption && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-700 rounded"
                  onClick={() => {
                    onChange('');
                    closeDropdown();
                  }}
                >
                  Quitar selección
                </button>
              )}

              {filteredOptions.map((option, index) => {
                const optionLabel = formatOptionLabel(option);
                return (
                  <button
                    key={option.id}
                    type="button"
                    data-option
                    className={`w-full text-left px-3 py-2 text-sm rounded ${
                      option.id === value
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${activeIndex === index ? 'ring-1 ring-blue-500' : ''}`}
                    onClick={() => handleSelect(option.id)}
                  >
                    <div className="flex flex-col">
                      <span>{optionLabel}</span>
                      {option.metadata?.calories && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {option.metadata.calories} kcal aprox
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {helperText && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helperText}</p>}
    </div>
  );
}
