'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits, encodeFunctionData } from 'viem';
import { CheckCircle, Loader2, AlertCircle, ExternalLink, Coins } from 'lucide-react';

type EVMPaymentFlowProps = {
  orderId: string;
  amount: number;
  customerEmail: string;
  onComplete: (txHash: string) => void;
};

const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const XOCO_WALLET = process.env.NEXT_PUBLIC_XOCO_WALLET_ADDRESS || '0x...';

const USDC_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export function EVMPaymentFlow({
  orderId,
  amount,
  customerEmail,
  onComplete,
}: EVMPaymentFlowProps) {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [status, setStatus] = useState<'idle' | 'sending' | 'confirming' | 'confirmed' | 'error'>(
    'idle'
  );
  const [txHash, setTxHash] = useState<string>();
  const [error, setError] = useState<string>();

  const handlePayment = async () => {
    if (!walletClient || !address || !publicClient) {
      setError('Wallet no conectada');
      return;
    }

    try {
      setStatus('sending');
      setError(undefined);

      const amountInUSDC = parseUnits(amount.toString(), 6);

      const data = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [XOCO_WALLET as `0x${string}`, amountInUSDC],
      });

      const hash = await walletClient.sendTransaction({
        to: USDC_ADDRESS,
        data,
        chain,
      });

      setTxHash(hash);
      setStatus('confirming');

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status === 'success') {
        setStatus('confirmed');
        await fetch('/api/orders/confirm-crypto-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            txHash: hash,
            network: chain?.name,
            amount,
            customerEmail,
            walletAddress: address,
          }),
        });
        onComplete(hash);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: unknown) {
      console.error('Payment error:', error);
      const message = error instanceof Error ? error.message : 'Error al procesar el pago';
      setStatus('error');
      setError(message);
    }
  };

  if (!isConnected) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Información:</strong> Pagarás {amount} USDC en{' '}
            {chain?.name || 'una red compatible'} (comisión ~$0.01)
          </p>
        </div>
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button
              onClick={openConnectModal}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <Coins className="w-5 h-5" />
              Conectar Wallet
            </button>
          )}
        </ConnectButton.Custom>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="font-medium text-green-900">Wallet Conectada</p>
          <p className="text-sm text-green-700">
            {address?.substring(0, 10)}...{address?.substring(address.length - 8)}
          </p>
          <p className="text-xs text-green-600">Red: {chain?.name}</p>
        </div>
      </div>

      {status === 'idle' && (
        <button
          onClick={handlePayment}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
        >
          Pagar {amount} USDC
        </button>
      )}

      {status === 'sending' && (
        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 flex items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <div>
            <p className="font-semibold text-blue-900">Enviando transacción...</p>
            <p className="text-sm text-blue-700">Confirma en tu wallet</p>
          </div>
        </div>
      )}

      {status === 'confirming' && (
        <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            <div>
              <p className="font-semibold text-orange-900">Esperando confirmación...</p>
              <p className="text-sm text-orange-700">~2 segundos en {chain?.name || 'esta red'}</p>
            </div>
          </div>
          {txHash && (
            <a
              href={
                (chain?.blockExplorers?.default?.url || 'https://etherscan.io') + `/tx/${txHash}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-orange-600 hover:text-orange-800 flex items-center gap-1"
            >
              Ver en Polygonscan <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {status === 'confirmed' && (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
            <div>
              <p className="font-bold text-xl text-green-900">¡Pago Confirmado!</p>
              <p className="text-sm text-green-700">Tu pedido está en preparación</p>
            </div>
          </div>
          {txHash && (
            <a
              href={
                (chain?.blockExplorers?.default?.url || 'https://etherscan.io') + `/tx/${txHash}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1 font-medium"
            >
              Ver transacción <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {status === 'error' && error && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-900 mb-2">Error en el pago</p>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
