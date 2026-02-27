'use client';

import type { HTMLAttributes } from 'react';
import classNames from 'classnames';

export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={classNames(
        'flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-200',
        className
      )}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={classNames('text-xs font-medium leading-relaxed', className)} {...props} />;
}
