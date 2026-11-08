# Musiz — musiz.xyz

Fan-funded album launchpad for independent artists. Vite + React + wagmi (Base, BNB Chain, Robinhood) + Solana Wallet Standard.

## Network mode
In `src/config/token.json`: `"mode": "multi"` = Base, BNB Chain, Robinhood, Solana · `"mode": "single"` = only `singleNetwork` (e.g. `"robinhood"`). CA cards, buy links, market table, wallet modal and chain lists adapt automatically.

## Token contract addresses
Edit `src/config/token.json` on GitHub (`evmAddress` is shared by Base/BNB/Robinhood, `solanaAddress` for Solana). Vercel redeploys on push; live price/liquidity comes from DexScreener.

## Dev
```
npm i
npm run dev
```
Optional env vars: see `.env.example`.
