// USDC (Native) - Emitido directamente por Circle
export const USDC_CONTRACTS = {
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Native USDC
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Native USDC
  optimism: '0x0b2c639c533813f4aa9d7837caf62653d097ff85', // Native USDC
  zkSync: '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4', // Native USDC
  monad: '0x...', // TODO: Obtener cuando lancen USDC en Monad
} as const;

// USDC.e (Bridged) - Versión puenteada desde Ethereum
export const USDC_BRIDGED_CONTRACTS = {
  polygon: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC.e
  arbitrum: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', // USDC.e
  optimism: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // USDC.e
  zkSync: '0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4', // USDC.e
} as const;

// USDT (Tether) - Stablecoin más usado globalmente
export const USDT_CONTRACTS = {
  ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Bridged USDT
  optimism: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // Bridged USDT
  zkSync: '0x493257fD37EDB34451f62EDf8D2a0C418852bA4C', // USDT
  monad: '0x...', // TODO: Confirmar cuando lancen
} as const;

// PYUSD (PayPal USD) - Stablecoin de PayPal emitido por Paxos
export const PYUSD_CONTRACTS = {
  ethereum: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8', // Mainnet
  polygon: null,
  arbitrum: null,
  optimism: null,
  zkSync: null,
  monad: null,
} as const;

// DAI - Stablecoin descentralizado de MakerDAO
export const DAI_CONTRACTS = {
  ethereum: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  polygon: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  arbitrum: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  optimism: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  zkSync: '0x4B9eb6c0b6ea15176BBF62841C6B2A8a398cb656',
  monad: '0x...',
} as const;

const chainMap: Record<number, keyof typeof USDC_CONTRACTS> = {
  1: 'ethereum',
  137: 'polygon',
  42161: 'arbitrum',
  10: 'optimism',
  324: 'zkSync',
  41454: 'monad',
};

type TokenKey = 'USDC' | 'USDC.e' | 'USDT' | 'PYUSD' | 'DAI';

export function getTokenContract(token: TokenKey, chainId: number): string | null {
  const chain = chainMap[chainId];
  if (!chain) return null;

  switch (token) {
    case 'USDC':
      return USDC_CONTRACTS[chain] || null;
    case 'USDC.e':
      if (chain in USDC_BRIDGED_CONTRACTS) {
        return USDC_BRIDGED_CONTRACTS[chain as keyof typeof USDC_BRIDGED_CONTRACTS] || null;
      }
      return null;
    case 'USDT':
      return USDT_CONTRACTS[chain] || null;
    case 'PYUSD':
      return PYUSD_CONTRACTS[chain] || null;
    case 'DAI':
      return DAI_CONTRACTS[chain] || null;
    default:
      return null;
  }
}

export const TOKEN_DECIMALS = {
  USDC: 6,
  'USDC.e': 6,
  USDT: 6,
  PYUSD: 6,
  DAI: 18,
  ETH: 18,
  BTC: 8,
} as const;
