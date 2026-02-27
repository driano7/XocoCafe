'use client';

import { createContext, useContext } from 'react';
import type { ReactNode, HTMLAttributes, ComponentPropsWithoutRef } from 'react';
import classNames from 'classnames';

interface SelectContextValue {
  value?: string;
  onValueChange: (value: string) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const handleChange = (next: string) => {
    onValueChange?.(next);
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleChange }}>
      <div className="rounded-lg border border-gray-200 bg-white/80 shadow-sm focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-400 dark:border-gray-700 dark:bg-black/60">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps extends HTMLAttributes<HTMLButtonElement> {}
export function SelectTrigger({ className, ...props }: SelectTriggerProps) {
  return (
    <button
      type="button"
      className={classNames(
        'flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-700 placeholder:font-normal placeholder:text-gray-400 dark:text-gray-100',
        className
      )}
      {...props}
    />
  );
}

export function SelectValue() {
  const context = useContext(SelectContext);
  if (!context) {
    return null;
  }
  return <span>{context.value}</span>;
}

interface SelectContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}
export function SelectContent({ className, ...props }: SelectContentProps) {
  return (
    <div
      className={classNames(
        'flex flex-col divide-y divide-gray-100 overflow-hidden rounded-b-lg bg-white shadow-lg dark:divide-gray-900/40 dark:bg-gray-900',
        className
      )}
      {...props}
    />
  );
}

interface SelectItemProps extends ComponentPropsWithoutRef<'button'> {
  value: string;
}
export function SelectItem({ value, children, className, ...props }: SelectItemProps) {
  const context = useContext(SelectContext);
  if (!context) {
    return null;
  }

  const handleClick = () => {
    context.onValueChange(value);
  };

  return (
    <button
      type="button"
      className={classNames(
        'w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}
