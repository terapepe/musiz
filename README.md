# Musiz — musiz.xyz

Fan-funded album launchpad for independent artists. Vite + React + wagmi (Base, BNB Chain, Robinhood) + Solana Wallet Standard.

## Network mode
In `src/config/token.json`:
- `"mode": "single"` = only `singleNetwork` (`robinhood` | `solana` | `base` | `bsc`) — accent color, tagline, CA card, wallet modal and market table follow that network.
- `"mode": "multi"` = always Solana, Robinhood, Base, BNB Chain (order = `multiOrder`).

## Token contract addresses
`evmAddress` is shared by Base/BNB/Robinhood, `solanaAddress` for Solana. `chains.<key>` overrides `name`, `short`, `color`, `tagline`, `ca` per network (empty `ca` → shared address).
Networks with the same CA are grouped into one "Copy CA" button (e.g. "Copy RH/BASE/BSC CA") — no Buy links. Vercel redeploys on push; live price/liquidity comes from DexScreener.

## Dev
```
npm i
npm run dev
```
Optional env vars: see `.env.example`.
