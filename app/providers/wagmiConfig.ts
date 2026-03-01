'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, arbitrum, optimism, zkSync } from 'wagmi/chains';
import { defineChain } from 'viem';

const monad = defineChain({
  id: 41454,
  name: 'Monad',
  network: 'monad',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://monad.rpc.caldera.xyz/http'],
    },
    public: {
      http: ['https://monad.rpc.caldera.xyz/http'],
    },
  },
  blockExplorers: {
    default: { name: 'Monadscan', url: 'https://explorer.monad.xyz' },
  },
  testnet: false,
});

const WALLETCONNECT_PROJECT_ID = '21fef48091f12692cad574a6f7753643';

export const wagmiConfig = getDefaultConfig({
  appName: 'Xoco Café',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [arbitrum, optimism, zkSync, mainnet, monad],
  ssr: false,
});
