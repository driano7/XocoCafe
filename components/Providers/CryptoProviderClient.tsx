'use client';

import { ReactNode, useEffect, useState } from 'react';

type ProviderComponent = React.ComponentType<{ children: ReactNode }>;

export default function CryptoProviderClient({ children }: { children: ReactNode }) {
  const [Provider, setProvider] = useState<ProviderComponent | null>(null);

  useEffect(() => {
    let active = true;

    import('@/app/providers/CryptoProvider').then((mod) => {
      if (active) {
        setProvider(() => mod.CryptoProvider);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  if (!Provider) {
    return <>{children}</>;
  }

  return <Provider>{children}</Provider>;
}
