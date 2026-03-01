'use client';

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Checkout en Mantenimiento
          </h1>

          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6">
            <p className="text-orange-800 dark:text-orange-200">
              La funcionalidad de pagos crypto está temporalmente deshabilitada mientras realizamos
              mejoras.
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
              Por favor, usa los métodos de pago tradicionales mientras tanto.
            </p>
          </div>

          <a
            href="/"
            className="inline-block mt-6 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
