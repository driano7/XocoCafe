'use client';

import classNames from 'classnames';

interface FavoriteItemsListProps {
  beverage?: string | null;
  food?: string | null;
  isLoading?: boolean;
  className?: string;
  tone?: 'light' | 'dark';
}

const renderValue = (value?: string | null, isLoading?: boolean) => {
  if (isLoading) {
    return 'Cargando…';
  }
  if (!value) {
    return 'Aún no comparte favoritos';
  }
  return value;
};

export default function FavoriteItemsList({
  beverage,
  food,
  isLoading,
  className,
  tone = 'light',
}: FavoriteItemsListProps) {
  const isEmpty = !beverage && !food;
  const wrapperClass =
    tone === 'dark'
      ? 'border-white/20 bg-white/5 text-white'
      : 'border-primary-100/70 bg-white/90 text-gray-800 dark:border-white/10 dark:bg-gray-800/80 dark:text-white';
  const labelClass = tone === 'dark' ? 'text-white/60' : 'text-gray-500 dark:text-gray-300';
  const valueClass = tone === 'dark' ? 'text-white' : 'text-gray-900 dark:text-white';

  return (
    <section
      className={classNames(
        'rounded-2xl px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/5',
        wrapperClass,
        className
      )}
    >
      <p className={classNames('text-xs font-semibold uppercase tracking-[0.35em]', labelClass)}>
        Favoritos
      </p>
      <div className="mt-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <span className={classNames('text-xs uppercase tracking-[0.3em]', labelClass)}>
            Bebida
          </span>
          <span className={classNames('text-right font-semibold', valueClass)}>
            {renderValue(beverage, isLoading)}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className={classNames('text-xs uppercase tracking-[0.3em]', labelClass)}>
            Alimento
          </span>
          <span className={classNames('text-right font-semibold', valueClass)}>
            {renderValue(food, isLoading)}
          </span>
        </div>
      </div>
      {isEmpty && !isLoading && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-300">
          Cuando el cliente actualice sus preferencias desde POS se sincronizarán aquí.
        </p>
      )}
    </section>
  );
}
