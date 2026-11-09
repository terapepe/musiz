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

type Overrides = { name?: string; short?: string; color?: string; tagline?: string; ca?: string }
const OV = (token as { chains?: Record<string, Overrides> }).chains || {}

// dex = DexScreener slug, explorer = token page URL. name/short/color/tagline/ca come from token.json → chains
const BASE_NETWORKS = [
  { key: 'robinhood', icon: '/chains/robinhood.svg', name: 'Robinhood', short: 'RH', color: '#CCFF00', vm: 'evm', chainId: robinhood.id, dex: 'robinhood', explorer: import.meta.env.VITE_ROBINHOOD_EXPLORER || 'https://robinhoodchain.blockscout.com/token/' },
  { key: 'solana', icon: '/chains/solana.svg', name: 'Solana', short: 'SOL', color: '#9945FF', vm: 'svm', chainId: 0, dex: 'solana', explorer: 'https://solscan.io/token/' },
  { key: 'base', icon: '/chains/base.svg', name: 'Base', short: 'BASE', color: '#0052FF', vm: 'evm', chainId: base.id, dex: 'base', explorer: 'https://basescan.org/token/' },
  { key: 'bsc', icon: '/chains/bnb.svg', name: 'BNB Chain', short: 'BSC', color: '#F0B90B', vm: 'evm', chainId: bsc.id, dex: 'bsc', explorer: 'https://bscscan.com/token/' },
] as const

export type Network = Omit<(typeof BASE_NETWORKS)[number], 'name' | 'short' | 'color'> & { name: string; short: string; color: string; tagline: string; ca: string }

const clean = (o: Overrides = {}) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null))
export const networks: Network[] = BASE_NETWORKS.map((n) => ({ tagline: '', ca: '', ...n, ...clean(OV[n.key]) }))

// token.json → mode: "single" = only singleNetwork (robinhood | solana | base | bsc)
//                    "multi"  = always all 4 networks, ordered by multiOrder
export const isSingle = token.mode !== 'multi'
const byKey = (k: string) => networks.find((n) => n.key === k)
export const activeNetworks: Network[] = isSingle
  ? [byKey(token.singleNetwork) || networks[0]]
  : [...new Set([...(token.multiOrder || []), ...networks.map((n) => n.key)])].map(byKey).filter((n): n is Network => !!n)
export const primary = activeNetworks[0]
export const activeEvm = activeNetworks.filter((n) => n.vm === 'evm')
export const hasSolana = activeNetworks.some((n) => n.vm === 'svm')
export const activeEvmChains = evmChains.filter((c) => activeEvm.some((n) => n.chainId === c.id))
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five']
export const chainCount = (n: number) => `${WORDS[n] ?? n} chain${n === 1 ? '' : 's'}`

// "Solana, Base or BNB Chain"
export const names = (list: Network[], sep = 'or') => list.map((n) => n.name).join(', ').replace(/, ([^,]*)$/, ` ${sep} $1`)

// CA: chains.<key>.ca → else evmAddress (all EVM networks share it) / solanaAddress
export const caOf = (n: Network) => (n.ca || (n.vm === 'svm' ? token.solanaAddress : token.evmAddress) || '').trim()

// Networks sharing the same CA are grouped → one "Copy CA" button (multi: RH/BASE/BSC + SOL)
export type CaGroup = { id: string; ca: string; nets: Network[]; tag: string }
export const caGroups: CaGroup[] = activeNetworks.reduce<CaGroup[]>((acc, n) => {
  const ca = caOf(n), id = ca ? ca.toLowerCase() : n.key, g = acc.find((x) => x.id === id)
  if (g) { g.nets.push(n); g.tag = g.nets.map((x) => x.short).join('/') } else acc.push({ id, ca, nets: [n], tag: n.short })
  return acc
}, [])

// readable text color on top of a chain color
export const inkOn = (hex: string) => {
  const v = parseInt(hex.slice(1), 16)
  return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255 > 0.6 ? '#0e0c0b' : '#ffffff'
}
