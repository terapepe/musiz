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

// uni = Uniswap app chain slug, dex = DexScreener slug, explorer = token page URL
export const networks = [
  { key: 'base', icon: '/chains/base.svg', uni: 'base', name: 'Base', vm: 'evm', chainId: base.id, dex: 'base', explorer: 'https://basescan.org/token/' },
  { key: 'bsc', icon: '/chains/bnb.svg', uni: 'bnb', name: 'BNB Chain', vm: 'evm', chainId: bsc.id, dex: 'bsc', explorer: 'https://bscscan.com/token/' },
  { key: 'robinhood', icon: '/chains/robinhood.svg', uni: 'robinhood', name: 'Robinhood', vm: 'evm', chainId: robinhood.id, dex: 'robinhood', explorer: import.meta.env.VITE_ROBINHOOD_EXPLORER || '' },
  { key: 'solana', icon: '/chains/solana.svg', uni: 'solana', name: 'Solana', vm: 'svm', chainId: 0, dex: 'solana', explorer: 'https://solscan.io/token/' },
] as const

export type Network = (typeof networks)[number]

export const uniswapBuy = (n: Network, address: string) =>
  `https://app.uniswap.org/swap?chain=${n.uni}&outputCurrency=${address}`
