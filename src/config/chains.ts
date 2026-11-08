import { defineChain } from 'viem'
import token from './token.json'
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

// token.json → mode: "multi" = all networks · "single" = only singleNetwork (e.g. "robinhood")
export const isSingle = token.mode === 'single' && networks.some((n) => n.key === token.singleNetwork)
export const activeNetworks: Network[] = networks.filter((n) => !isSingle || n.key === token.singleNetwork)
export const activeEvm = activeNetworks.filter((n) => n.vm === 'evm')
export const hasSolana = activeNetworks.some((n) => n.vm === 'svm')
export const activeEvmChains = evmChains.filter((c) => activeEvm.some((n) => n.chainId === c.id))
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five']
export const chainCount = (n: number) => `${WORDS[n] ?? n} chain${n === 1 ? '' : 's'}`

export const uniswapBuy = (n: Network, address: string) =>
  `https://app.uniswap.org/swap?chain=${n.uni}&outputCurrency=${address}`
