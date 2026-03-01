'use client';

import { useEffect, useState } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { getTokenContract } from '@/lib/crypto/contracts';

type TokenSymbol = 'USDC' | 'USDC.e' | 'USDT' | 'PYUSD' | 'DAI';
type SupportedChainId = 42161 | 10 | 324 | 1 | 41454;

interface ChainTokenSelectorProps {
  onSelect: (chainId: number, token: string, contract: string) => void;
}

const chains = [
  { id: 42161, name: 'Arbitrum', cost: '~$0.05', speed: '15s', recommended: true },
  { id: 10, name: 'Optimism', cost: '~$0.10', speed: '10s' },
  { id: 324, name: 'zkSync', cost: '~$0.03', speed: '5s' },
  { id: 1, name: 'Ethereum', cost: '~$3-15', speed: '12s' },
  { id: 41454, name: 'Monad', cost: '~$0.001', speed: '<1s' },
];

const tokens: Array<{ symbol: TokenSymbol; name: string; available: SupportedChainId[] }> = [
  { symbol: 'USDC', name: 'USD Coin (Native)', available: [42161, 10, 324, 1] },
  { symbol: 'USDC.e', name: 'USD Coin (Bridged)', available: [42161, 10, 324] },
  { symbol: 'USDT', name: 'Tether USD', available: [42161, 10, 324, 1] },
  { symbol: 'PYUSD', name: 'PayPal USD', available: [1] },
  { symbol: 'DAI', name: 'Dai Stablecoin', available: [42161, 10, 324, 1] },
];

export function ChainTokenSelector({ onSelect }: ChainTokenSelectorProps) {
  const { chain: currentChain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [selectedChain, setSelectedChain] = useState<SupportedChainId>(42161);
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>('USDC');

  useEffect(() => {
    const contract = getTokenContract(selectedToken, selectedChain);
    if (contract) {
      onSelect(selectedChain, selectedToken, contract);
    }
  }, [onSelect, selectedChain, selectedToken]);

  const availableTokens = tokens.filter((token) => token.available.includes(selectedChain));

  const handleChainChange = (chainId: string) => {
    const id = Number(chainId) as SupportedChainId;
    setSelectedChain(id);

    const currentTokenAvailable = tokens
      .find((token) => token.symbol === selectedToken)
      ?.available.includes(id);

    if (!currentTokenAvailable) {
      setSelectedToken('USDC');
    }

    if (currentChain?.id !== id) {
      switchChain?.({ chainId: id });
    }
  };

  const handleTokenChange = (value: string) => {
    const token = value as TokenSymbol;
    setSelectedToken(token);
    const contract = getTokenContract(token, selectedChain);
    if (contract) {
      onSelect(selectedChain, token, contract);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="chain-select" className="block text-sm font-medium text-gray-700 mb-2">
          Red Blockchain
        </label>
        <Select value={selectedChain.toString()} onValueChange={handleChainChange}>
          <SelectTrigger className="w-full" id="chain-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {chains.map((chain) => (
              <SelectItem key={chain.id} value={chain.id.toString()}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{chain.name}</span>
                  {chain.recommended && (
                    <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                      Recomendado
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {chain.cost} • {chain.speed}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="token-select" className="block text-sm font-medium text-gray-700 mb-2">
          Token a pagar
        </label>
        <Select value={selectedToken} onValueChange={handleTokenChange}>
          <SelectTrigger className="w-full" id="token-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableTokens.map((token) => (
              <SelectItem key={token.symbol} value={token.symbol}>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{token.symbol}</span>
                  <span className="text-xs text-gray-500">{token.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {currentChain && currentChain.id !== selectedChain && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cambia tu wallet a la red {chains.find((c) => c.id === selectedChain)?.name}. Se abrirá
            un popup en tu wallet.
          </AlertDescription>
        </Alert>
      )}

      {selectedToken === 'PYUSD' && (
        <Alert className="bg-blue-50 border-blue-200 text-blue-900 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>PayPal USD:</strong> solo en Ethereum mainnet. Comisión más alta (~$3-15 por
            transacción).
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
