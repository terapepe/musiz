import token from './config/token.json'
import './styles.css'

// CA, name, symbol, X and Telegram follow the newest token hybot launched for this site (token.json = fallback).
// Synced before the app modules load, since chains.ts / components read token.json at import time.
const API = import.meta.env.VITE_TOKEN_API || 'https://hybot.xyz/api/site-token'

type Live = { found?: boolean; ca?: string; name?: string; symbol?: string; x?: string; telegram?: string }
async function syncToken() {
  try {
    const site = new URL(token.site).hostname
    const r = await fetch(`${API}?site=${encodeURIComponent(site)}`, { signal: AbortSignal.timeout(2500) })
    const j: Live = await r.json()
    if (!j.found || !/^0x[0-9a-fA-F]{40}$/.test(j.ca || '')) return
    const t = token as typeof token & { chains: Record<string, { ca?: string }> }
    t.evmAddress = j.ca!
    if (t.chains[t.singleNetwork]) t.chains[t.singleNetwork].ca = '' // EVM networks use evmAddress
    if (j.name) t.name = j.name
    if (j.symbol) t.symbol = j.symbol
    t.x = j.x || '' // no link on the launched token → no link on the site
    t.telegram = j.telegram || ''
  } catch { /* hybot unreachable: keep token.json */ }
}

syncToken().then(() => import('./boot'))
