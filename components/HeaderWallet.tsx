'use client';

import { useEffect, useRef, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Wallet, Sparkles, ChevronDown } from 'lucide-react';

const supportedTokens = ['ETH', 'BTC', 'USDC', 'USDT', 'PayPal stablecoins'];
const supportedNetworks = ['Ethereum', 'Bitcoin', 'Arbitrum', 'Optimism', 'zkSync'];

type HeaderWalletInnerProps = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  panelRef: React.RefObject<HTMLDivElement>;
};

function HeaderWalletInner({ open, setOpen, panelRef }: HeaderWalletInnerProps) {
  const { isConnected, chain } = useAccount();

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      if (
        panelRef.current &&
        event.target instanceof Node &&
        !panelRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open, panelRef, setOpen]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm transition hover:border-orange-500 hover:text-orange-600 dark:border-gray-700 dark:bg-black/70 dark:text-white"
      >
        <Wallet className="h-5 w-5" />
        <span className="hidden font-semibold text-xs uppercase tracking-widest sm:block">
          Wallet
        </span>
        <ChevronDown className="h-3 w-3 text-gray-500" />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-3 w-80 rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-2xl backdrop-blur-xl dark:border-gray-700 dark:bg-black/80"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
                Wallet Connect
              </p>
              <p className="text-[11px] text-gray-500">Tokens + redes</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-500">
                Tokens
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {supportedTokens.map((token) => (
                  <span
                    key={token}
                    className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-700 dark:border-gray-800 dark:text-gray-200"
                  >
                    {token}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-500">
                Redes
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                {supportedNetworks.map((network) => (
                  <span
                    key={network}
                    className="rounded-lg border border-dashed border-gray-200 px-2 py-1 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-300"
                  >
                    {network}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-4 text-xs font-semibold text-orange-700">
            <p>Estado:</p>
            <p className="text-base font-bold text-orange-800">
              {isConnected ? 'Conectado' : 'Desconectado'} {chain?.name ? `en ${chain.name}` : ''}
            </p>
          </div>

          <div className="mt-3">
            <ConnectButton.Custom>
              {({ openConnectModal, openAccountModal, mounted: rkMounted, account }) => {
                if (!rkMounted) {
                  return (
                    <button
                      type="button"
                      className="w-full rounded-xl border border-gray-300 bg-white/70 py-2 text-sm font-semibold text-gray-700 shadow-sm"
                      disabled
                    >
                      Cargando wallet...
                    </button>
                  );
                }

                if (!account) {
                  return (
                    <button
                      type="button"
                      onClick={openConnectModal}
                      className="w-full rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 py-2 text-sm font-semibold text-white shadow-lg"
                    >
                      Conectar wallet
                    </button>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={openAccountModal}
                    className="w-full rounded-xl border border-gray-300 bg-white py-2 text-sm font-semibold text-gray-700 shadow-sm"
                  >
                    {account.displayName || account.address}
                  </button>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HeaderWallet() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [wagmiLoaded, setWagmiLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    if (typeof window !== 'undefined') {
      import('wagmi')
        .then(() => setWagmiLoaded(true))
        .catch(() => console.warn('Wagmi not ready yet'));
    }
  }, []);

  if (!mounted || !wagmiLoaded) {
    return (
      <button
        type="button"
        disabled
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-sm font-medium text-gray-400 shadow-sm dark:border-gray-700 dark:bg-black/70"
      >
        <Wallet className="h-5 w-5" />
        <span className="hidden font-semibold text-xs uppercase tracking-widest sm:block">
          Wallet
        </span>
      </button>
    );
  }

  return <HeaderWalletInner open={open} setOpen={setOpen} panelRef={panelRef} />;
}
