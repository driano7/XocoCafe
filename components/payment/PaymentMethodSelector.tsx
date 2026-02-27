'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bitcoin, Coins, Wallet } from 'lucide-react';
import { EVMPaymentFlow } from './EVMPaymentFlow';
import { LightningPaymentFlow } from './LightningPaymentFlow';

type PaymentMethodSelectorProps = {
  orderId: string;
  orderTotal: number;
  customerEmail: string;
  onPaymentComplete: (txHash: string, method: 'evm' | 'lightning') => void;
  onCancel: () => void;
};

export function PaymentMethodSelector({
  orderId,
  orderTotal,
  customerEmail,
  onPaymentComplete,
  onCancel,
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<'evm' | 'lightning'>('evm');

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagar con Criptomonedas</h2>
        <p className="text-gray-600">Selecciona tu método preferido y conecta tu wallet</p>
      </div>

      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 mb-6 border-2 border-orange-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total a pagar</p>
            <p className="text-4xl font-bold text-gray-900">${orderTotal.toFixed(2)} USD</p>
          </div>
          <Wallet className="w-16 h-16 text-orange-500" />
        </div>
      </div>

      <Tabs
        value={selectedMethod}
        onValueChange={(value) => setSelectedMethod(value as 'evm' | 'lightning')}
      >
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger
            value="evm"
            className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            <Coins className="w-4 h-4" />
            <span>ETH / Stablecoins</span>
          </TabsTrigger>
          <TabsTrigger
            value="lightning"
            className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            <Bitcoin className="w-4 h-4" />
            <span>Bitcoin Lightning</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evm">
          <div className="space-y-4">
            <EVMPaymentFlow
              orderId={orderId}
              amount={orderTotal}
              customerEmail={customerEmail}
              onComplete={(txHash) => onPaymentComplete(txHash, 'evm')}
            />
          </div>
        </TabsContent>

        <TabsContent value="lightning">
          <div className="space-y-4">
            <LightningPaymentFlow
              orderId={orderId}
              amount={orderTotal}
              customerEmail={customerEmail}
              onComplete={(preimage) => onPaymentComplete(preimage, 'lightning')}
            />
          </div>
        </TabsContent>
      </Tabs>

      <button
        onClick={onCancel}
        className="w-full mt-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
      >
        Cancelar y volver
      </button>
    </div>
  );
}
