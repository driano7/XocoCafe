'use client';

interface LoyaltyReminderCardProps {
  onActivate: () => void | Promise<void>;
  className?: string;
  isLoading?: boolean;
}

export default function LoyaltyReminderCard({
  onActivate,
  className = '',
  isLoading = false,
}: LoyaltyReminderCardProps) {
  return (
    <div
      className={`rounded-2xl border border-primary-200 bg-primary-50/80 p-4 text-sm text-primary-900 shadow-sm dark:border-primary-800/40 dark:bg-primary-950/40 dark:text-primary-100 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-primary-500 dark:text-primary-300">
            Programa de lealtad
          </p>
          <p className="text-base font-semibold text-primary-900 dark:text-primary-50">
            Activa tus sellos y canjea cafés sin costo
          </p>
          <p className="text-xs text-primary-800 dark:text-primary-200">
            Solo toma un minuto conectar tu cuenta al programa. Después, seguimos tu saldo de manera
            automática.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void onActivate();
          }}
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-400"
        >
          {isLoading ? 'Activando...' : 'Activar ahora'}
        </button>
      </div>
    </div>
  );
}
