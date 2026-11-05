import { ReactNode, useMemo } from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { base, bsc } from 'viem/chains'
import { robinhood } from '../config/chains'

const wagmiConfig = createConfig({
  chains: [base, bsc, robinhood],
  // EIP-6963: every installed EVM wallet (MetaMask, Rabby, OKX, Coinbase...) shows up on its own
  multiInjectedProviderDiscovery: true,
  transports: { [base.id]: http(), [bsc.id]: http(), [robinhood.id]: http() },
})

const queryClient = new QueryClient()
const SOL_RPC = import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com'

export function Providers({ children }: { children: ReactNode }) {
  // Empty list: Wallet Standard auto-detects Phantom, Solflare, Backpack...
  const solWallets = useMemo(() => [], [])
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectionProvider endpoint={SOL_RPC}>
          <WalletProvider wallets={solWallets} autoConnect>
            {children}
          </WalletProvider>
        </ConnectionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
