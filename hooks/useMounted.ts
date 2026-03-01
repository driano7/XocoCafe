import { useEffect, useState } from 'react';

/**
 * Hook to detect when component is mounted on client-side
 * Prevents hydration errors with client-only components
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
