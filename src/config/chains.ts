import { defineChain } from 'viem'
import { base, bsc } from 'viem/chains'

export const robinhood = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_ROBINHOOD_RPC || 'https://rpc.nodeflare.app/robinhood/public'] },
  },
})

export const evmChains = [base, bsc, robinhood] as const

// DexScreener chain slugs + explorer token URLs per network
export const networks = [
  { key: 'base', name: 'Base', vm: 'evm', chainId: base.id, dex: 'base', explorer: 'https://basescan.org/token/' },
  { key: 'bsc', name: 'BNB Chain', vm: 'evm', chainId: bsc.id, dex: 'bsc', explorer: 'https://bscscan.com/token/' },
  { key: 'robinhood', name: 'Robinhood', vm: 'evm', chainId: robinhood.id, dex: 'robinhood', explorer: import.meta.env.VITE_ROBINHOOD_EXPLORER || '' },
  { key: 'solana', name: 'Solana', vm: 'svm', chainId: 0, dex: 'solana', explorer: 'https://solscan.io/token/' },
] as const

export type Network = (typeof networks)[number]
