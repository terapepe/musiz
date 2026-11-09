import { useQuery } from '@tanstack/react-query'
import token from '../config/token.json'
import { activeNetworks, caOf, Network } from '../config/chains'

export type Market = {
  network: Network
  address: string
  priceUsd?: number
  liquidityUsd?: number
  volume24h?: number
  change24h?: number
  fdv?: number
  symbol?: string
  pairUrl?: string
}

const addrFor = (n: Network) => caOf(n)

async function fetchMarket(n: Network): Promise<Market> {
  const address = addrFor(n)
  const base: Market = { network: n, address }
  if (!address) return base
  const r = await fetch(`https://api.dexscreener.com/tokens/v1/${n.dex}/${address}`)
  if (!r.ok) return base
  const pairs: any[] = await r.json()
  if (!Array.isArray(pairs) || !pairs.length) return base
  const p = pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0]
  return {
    ...base,
    priceUsd: Number(p.priceUsd),
    liquidityUsd: p.liquidity?.usd,
    volume24h: pairs.reduce((s, x) => s + (x.volume?.h24 ?? 0), 0),
    change24h: p.priceChange?.h24,
    fdv: p.fdv,
    symbol: p.baseToken?.address?.toLowerCase() === address.toLowerCase() ? p.baseToken.symbol : p.quoteToken?.symbol,
    pairUrl: p.url,
  }
}

export function useTokenMarkets() {
  return useQuery({
    queryKey: ['markets', token.evmAddress, token.solanaAddress],
    queryFn: () => Promise.all(activeNetworks.map((n) => fetchMarket(n).catch(() => ({ network: n, address: addrFor(n) }) as Market))),
    refetchInterval: 60_000,
  })
}
