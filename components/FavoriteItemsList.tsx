'use client';

import classNames from 'classnames';

interface FavoriteItemsListProps {
  beverage?: string | null;
  food?: string | null;
  isLoading?: boolean;
  className?: string;
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
}: FavoriteItemsListProps) {
  const isEmpty = !beverage && !food;

  return (
    <section
      className={classNames(
        'rounded-2xl border border-primary-100/70 bg-white/90 px-4 py-3 text-sm text-gray-800 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100',
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-400 dark:text-gray-300">
        Favoritos
      </p>
      <div className="mt-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
            Bebida
          </span>
          <span className="text-right font-semibold text-gray-900 dark:text-gray-100">
            {renderValue(beverage, isLoading)}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
            Alimento
          </span>
          <span className="text-right font-semibold text-gray-900 dark:text-gray-100">
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
