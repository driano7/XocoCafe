'use client';

import type { ComponentPropsWithoutRef, ElementType } from 'react';
import { useAutoTranslation } from '@/hooks/useAutoTranslation';

type AutoTranslatedTextProps<T extends ElementType> = {
  spanish: string;
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, 'children'>;

export default function AutoTranslatedText<T extends ElementType = 'span'>({
  spanish,
  as,
  ...props
}: AutoTranslatedTextProps<T>) {
  const { translation, status, shouldTranslate } = useAutoTranslation(spanish);
  const Component = as ?? 'span';
  const displayText = shouldTranslate ? translation || spanish : spanish;

  return (
    <Component
      {...(props as ComponentPropsWithoutRef<T>)}
      aria-live={shouldTranslate ? 'polite' : undefined}
      data-translation-status={shouldTranslate ? status : undefined}
    >
      {displayText}
    </Component>
  );
}
