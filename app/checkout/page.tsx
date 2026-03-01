'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic import para PaymentMethodSelector
const PaymentMethodSelector = dynamic(
  () =>
    import('@/components/payment/PaymentMethodSelector').then((mod) => mod.PaymentMethodSelector),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando opciones de pago...</p>
        </div>
      </div>
    ),
  }
);

export default function CheckoutPage() {
  const router = useRouter();
  const [showCrypto, setShowCrypto] = useState(false);

  const orderId = 'order_123';
  const orderTotal = 25.5;
  const customerEmail = 'cliente@example.com';

  const handlePaymentComplete = async (txHash: string, method: 'evm' | 'lightning') => {
    console.log('Payment completed:', { txHash, method });
    router.push(`/order-confirmation?orderId=${orderId}&txHash=${txHash}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {!showCrypto && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Método de Pago
              </h1>

              <div className="space-y-4">
                {/* Otros métodos de pago tradicionales aquí */}

                <button
                  onClick={() => setShowCrypto(true)}
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
                >
                  <span className="text-2xl">💰</span>
                  <span>Pagar con Criptomonedas</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {showCrypto && (
          <PaymentMethodSelector
            orderId={orderId}
            orderTotal={orderTotal}
            customerEmail={customerEmail}
            onPaymentComplete={handlePaymentComplete}
            onCancel={() => setShowCrypto(false)}
          />
        )}
      </div>
    </div>
  );
}
