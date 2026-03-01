'use client';

import { useEffect, useState } from 'react';

// Importaciones condicionales para SSR safety
let RainbowKitProvider: any = null;
let WagmiProvider: any = null;
let QueryClientProvider: any = null;
let QueryClient: any = null;
let wagmiConfig: any = null;

if (typeof window !== 'undefined') {
  // Solo cargar en cliente
  import('@rainbow-me/rainbowkit/styles.css');

  Promise.all([
    import('@rainbow-me/rainbowkit'),
    import('wagmi'),
    import('@tanstack/react-query'),
    import('./wagmiConfig'), // Moveremos la config a un archivo separado
  ]).then(([rainbowkit, wagmi, reactQuery, config]) => {
    RainbowKitProvider = rainbowkit.RainbowKitProvider;
    WagmiProvider = wagmi.WagmiProvider;
    QueryClientProvider = reactQuery.QueryClientProvider;
    QueryClient = reactQuery.QueryClient;
    wagmiConfig = config.wagmiConfig;
  });
}

const queryClient = typeof window !== 'undefined' ? new (QueryClient || class {})() : null;

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [providersLoaded, setProvidersLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Esperar a que los providers carguen
    const checkLoaded = setInterval(() => {
      if (WagmiProvider && RainbowKitProvider && wagmiConfig) {
        setProvidersLoaded(true);
        clearInterval(checkLoaded);
      }
    }, 100);

    return () => clearInterval(checkLoaded);
  }, []);

  // Durante SSR o antes de cargar, solo renderizar children
  if (!mounted || !providersLoaded || !WagmiProvider || !RainbowKitProvider || !wagmiConfig) {
    return <>{children}</>;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact">{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
