'use client';

import { useState } from 'react';
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';
import { useRouter } from 'next/navigation';

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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {!showCrypto && (
          <div className="space-y-4">
            <button
              onClick={() => setShowCrypto(true)}
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              💰 Pagar con Criptomonedas
            </button>
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
