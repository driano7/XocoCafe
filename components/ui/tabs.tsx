'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode, HTMLAttributes, ComponentPropsWithoutRef } from 'react';
import classNames from 'classnames';

interface TabsContextValue {
  activeValue: string | undefined;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

export function Tabs({ value, defaultValue, onValueChange, children }: TabsProps) {
  const [internalValue, setInternalValue] = useState<string | undefined>(defaultValue);
  const activeValue = value ?? internalValue;

  const contextValue = useMemo<TabsContextValue>(
    () => ({
      activeValue,
      onChange: (next) => {
        if (value === undefined) {
          setInternalValue(next);
        }
        onValueChange?.(next);
      },
    }),
    [value, activeValue, onValueChange]
  );

  return <TabsContext.Provider value={contextValue}>{children}</TabsContext.Provider>;
}

interface TabsListProps extends HTMLAttributes<HTMLDivElement> {}
export function TabsList({ className, ...props }: TabsListProps) {
  return <div {...props} className={classNames('flex flex-wrap gap-2', className)} />;
}

interface TabsTriggerProps extends ComponentPropsWithoutRef<'button'> {
  value: string;
}
export function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsTrigger must be rendered inside Tabs');
  }

  const isActive = context.activeValue === value;
  return (
    <button
      type="button"
      {...props}
      onClick={(event) => {
        event.preventDefault();
        context.onChange(value);
      }}
      className={classNames(
        'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
        isActive
          ? 'bg-orange-500 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200',
        className
      )}
    />
  );
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
}
export function TabsContent({ value, children }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsContent must be rendered inside Tabs');
  }

  if (context.activeValue !== value) {
    return null;
  }

  return <div>{children}</div>;
}
