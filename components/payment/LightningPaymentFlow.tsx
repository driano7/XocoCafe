'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import {
  Button as LightningButton,
  init as initBitcoinConnect,
} from '@getalby/bitcoin-connect-react';
interface LightningProvider {
  sendPayment: (invoice: string) => Promise<void>;
}

const QRCodeCanvas = dynamic(() => import('qrcode.react').then((mod) => mod.QRCodeCanvas), {
  ssr: false,
});
import { CheckCircle, Loader2, Copy, Zap } from 'lucide-react';

const POLLING_INTERVAL = 2000;
const POLLING_TIMEOUT = 600000;

interface LightningPaymentFlowProps {
  orderId: string;
  amount: number;
  customerEmail: string;
  onComplete: (preimage: string) => void;
}

export function LightningPaymentFlow({
  orderId,
  amount,
  customerEmail,
  onComplete,
}: LightningPaymentFlowProps) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'waiting' | 'paid' | 'error'>(
    'idle'
  );
  const [invoice, setInvoice] = useState<string>();
  const [amountSats, setAmountSats] = useState<number>(0);
  const [paymentHash, setPaymentHash] = useState<string>();
  const [error, setError] = useState<string>();

  const generateInvoice = useCallback(async () => {
    try {
      setStatus('generating');
      setError(undefined);

      const response = await fetch('/api/crypto/lightning/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amountUSD: amount, customerEmail }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      const data = await response.json();
      setInvoice(data.invoice);
      setAmountSats(data.amountSats);
      setPaymentHash(data.paymentHash);
      setStatus('waiting');

      return data.paymentHash;
    } catch (error: unknown) {
      console.error('Invoice generation error:', error);
      const message = error instanceof Error ? error.message : 'Error al generar invoice';
      setStatus('error');
      setError(message);
      return undefined;
    }
  }, [orderId, amount, customerEmail]);

  const startPaymentPolling = useCallback(
    (hash: string) => {
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/crypto/lightning/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentHash: hash }),
          });

          if (!response.ok) {
            throw new Error('Failed to check payment status');
          }

          const data = await response.json();

          if (data.settled) {
            clearInterval(interval);
            clearTimeout(timeout);
            setStatus('paid');
            onComplete(hash);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, POLLING_INTERVAL);

      const timeout = setTimeout(() => clearInterval(interval), POLLING_TIMEOUT);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    },
    [onComplete]
  );

  useEffect(() => {
    initBitcoinConnect({ appName: 'Xoco Café' });
  }, []);

  useEffect(() => {
    if (status === 'waiting' && paymentHash) {
      const cleanup = startPaymentPolling(paymentHash);
      return cleanup;
    }
  }, [startPaymentPolling, status, paymentHash]);

  const copyInvoice = () => {
    if (!invoice) return;
    navigator.clipboard.writeText(invoice);
  };

  const handleGenerateInvoice = async () => {
    const hash = await generateInvoice();
    if (hash) {
      setPaymentHash(hash);
    }
  };

  if (status === 'idle') {
    return (
      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-800">
            <strong>Pago instantáneo:</strong> Confirma tu pago Lightning en menos de 1 segundo.
            Comisión casi cero (~1 sat).
          </p>
        </div>
        <button
          onClick={handleGenerateInvoice}
          className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          <Zap className="w-5 h-5" />
          Generar Invoice Lightning
        </button>
      </div>
    );
  }

  if (status === 'generating') {
    return (
      <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 flex items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="font-semibold text-blue-900">Generando invoice...</p>
      </div>
    );
  }

  if (status === 'waiting' && invoice) {
    return (
      <div className="space-y-6">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600 mb-1">Monto a pagar</p>
          <p className="text-3xl font-bold text-orange-600">{amountSats.toLocaleString()} sats</p>
          <p className="text-xs text-gray-500 mt-1">≈ ${amount.toFixed(2)} USD</p>
        </div>

        <div className="bg-white border-2 border-gray-300 rounded-xl p-6 flex flex-col items-center">
          <p className="text-sm font-medium text-gray-700 mb-4">Escanea con tu wallet Lightning</p>
          <QRCodeCanvas value={invoice.toUpperCase()} size={250} level="M" includeMargin />
        </div>

        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
          <p className="text-xs text-gray-600 mb-2 font-medium">Lightning Invoice:</p>
          <div className="bg-white border border-gray-200 rounded p-2 flex items-center gap-2">
            <code className="text-xs text-gray-800 break-all flex-1">
              {invoice.substring(0, 40)}...
            </code>
            <button
              onClick={copyInvoice}
              className="flex-shrink-0 p-2 hover:bg-gray-100 rounded"
              title="Copiar invoice"
            >
              <Copy className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-3">O conecta tu wallet Lightning directamente:</p>
          <LightningButton
            onConnected={async (provider: LightningProvider) => {
              try {
                await provider.sendPayment(invoice);
              } catch (error) {
                console.error('Payment error:', error);
              }
            }}
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <p className="text-sm text-blue-800">Esperando pago...</p>
        </div>
      </div>
    );
  }

  if (status === 'paid') {
    return (
      <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
          <div>
            <p className="font-bold text-xl text-green-900">¡Pago Confirmado!</p>
            <p className="text-sm text-green-700">Lightning payment successful</p>
          </div>
        </div>
        <p className="text-sm text-green-600 font-mono">Hash: {paymentHash?.substring(0, 20)}...</p>
      </div>
    );
  }

  if (status === 'error' && error) {
    return (
      <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
        <p className="font-semibold text-red-900 mb-2">Error</p>
        <p className="text-sm text-red-700 mb-4">{error}</p>
        <button
          onClick={() => setStatus('idle')}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return null;
}
