# Musiz — musiz.xyz

Fan-funded album launchpad for independent artists. Vite + React + wagmi (Base, BNB Chain, Robinhood) + Solana Wallet Standard.

## Token contract addresses
Edit `src/config/token.json` on GitHub (`evmAddress` is shared by Base/BNB/Robinhood, `solanaAddress` for Solana). Vercel redeploys on push; live price/liquidity comes from DexScreener.

## Dev
```
npm i
npm run dev
```
Optional env vars: see `.env.example`.
