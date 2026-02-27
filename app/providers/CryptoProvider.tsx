'use client';

import '@rainbow-me/rainbowkit/styles.css';
import {
  RainbowKitProvider,
  connectorsForWallets,
  getDefaultWallets,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, createConfig } from 'wagmi';
import {
  mainnet,
  arbitrum,
  optimism,
  zkSync,
  polygonMumbai,
  arbitrumSepolia,
  optimismSepolia,
} from 'wagmi/chains';
import { http, defineChain, type Chain } from 'viem';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { init as initBitcoinConnect } from '@getalby/bitcoin-connect-react';
import { useEffect } from 'react';

const monadRpcHttp = process.env.NEXT_PUBLIC_MONAD_RPC_HTTP || 'https://monad.rpc.caldera.xyz/http';
const monadRpcWs = process.env.NEXT_PUBLIC_MONAD_RPC_WS || 'wss://monad.rpc.caldera.xyz/ws';

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
      http: [monadRpcHttp],
      webSocket: [monadRpcWs],
    },
    public: {
      http: [monadRpcHttp],
      webSocket: [monadRpcWs],
    },
  },
  blockExplorers: {
    default: { name: 'Monadscan', url: 'https://explorer.monad.xyz' },
  },
  testnet: false,
});

const zkSyncTestnet = defineChain({
  id: 280,
  name: 'zkSync Era Testnet',
  network: 'zkSyncTestnet',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['https://testnet.era.zksync.dev'] },
    public: { http: ['https://testnet.era.zksync.dev'] },
  },
  blockExplorers: {
    default: { name: 'zkSync Explorer', url: 'https://goerli.explorer.zksync.io' },
  },
  testnet: true,
});

const supportedChains: readonly [Chain, ...Chain[]] = [arbitrum, optimism, zkSync, mainnet, monad];
const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

const transports = {
  [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc'),
  [optimism.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_RPC || 'https://mainnet.optimism.io'),
  [zkSync.id]: http(process.env.NEXT_PUBLIC_ZKSYNC_RPC || 'https://mainnet.era.zksync.io'),
  [mainnet.id]: http(process.env.NEXT_PUBLIC_ETHEREUM_RPC || 'https://eth.llamarpc.com'),
  [monad.id]: http(process.env.NEXT_PUBLIC_MONAD_RPC || 'https://monad.rpc.caldera.xyz/http'),
};

const { wallets } = getDefaultWallets({
  appName: 'Xoco Café',
  projectId: WALLETCONNECT_PROJECT_ID,
});

const wagmiConfig = createConfig({
  chains: supportedChains,
  transports,
  connectors: connectorsForWallets(wallets, {
    appName: 'Xoco Café',
    projectId: WALLETCONNECT_PROJECT_ID,
  }),
});

const queryClient = new QueryClient();

export const testnetChains = [polygonMumbai, arbitrumSepolia, optimismSepolia, zkSyncTestnet];

export const testnetConfig = {
  chains: testnetChains,
  transports: {
    [polygonMumbai.id]: http(
      process.env.NEXT_PUBLIC_POLYGON_MUMBAI_RPC || 'https://rpc-mumbai.maticvigil.com'
    ),
    [arbitrumSepolia.id]: http(
      process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc'
    ),
    [optimismSepolia.id]: http(
      process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC || 'https://sepolia.optimism.io'
    ),
    [zkSyncTestnet.id]: http(
      process.env.NEXT_PUBLIC_ZKSYNC_TESTNET_RPC || 'https://testnet.era.zksync.dev'
    ),
  },
};

export const testnetFaucets = {
  polygon: 'https://faucet.polygon.technology',
  arbitrum: 'https://faucet.quicknode.com/arbitrum/sepolia',
  optimism: 'https://app.optimism.io/faucet',
  zkSync: 'https://goerli.portal.zksync.io/faucet',
};

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initBitcoinConnect({
      appName: 'Xoco Café',
      showBalance: true,
    });
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          theme={lightTheme({
            accentColor: '#ea580c',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
