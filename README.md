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

## Music NFTs (`contracts/`)
`MusizMusic.sol` — ERC-1155, one id per track, priced and paid in the token from `token.json` (`symbol`, CA).
Artists must hold `minHold` tokens to create; each sale sends `burnBps` to `0x…dEaD`, `feeBps` to the treasury, the rest to the artist (burn + fee capped at 30%). Metadata is fully onchain; artists paste IPFS/Arweave/https URLs for cover and audio.

```
cd contracts && npm i
npm test                                  # compile + tests on a local EVM
PRIVATE_KEY=0x.. NETWORK=robinhood TREASURY=0x.. npm run deploy
# optional: RPC_URL=..  BURN_BPS=200  FEE_BPS=300  MIN_HOLD=1000
```
Deploy writes the address into `src/config/token.json → music.<network>`; commit and push, the site picks it up. Networks shown follow `mode` / `singleNetwork` / `multiOrder` (EVM networks only).
