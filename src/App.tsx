import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import token from './config/token.json'
import { ConnectModal, short } from './wallet/ConnectModal'
import { useTokenMarkets, Market } from './hooks/useTokenMarkets'
import { ContractStrip } from './components/ContractStrip'

const usd = (n?: number, d = 0) =>
  n == null || Number.isNaN(n) ? '—' : n < 1 && d === 0
    ? `$${n.toPrecision(3)}`
    : `$${Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: d || 2 }).format(n)}`

const STEPS = [
  ['Pledge', 'Fans back an unreleased album by minting an Access Pass with $' + token.symbol + ' or stablecoins.', '0:42'],
  ['Escrow', 'Every pledge sits in a smart contract. The artist cannot touch it up front.', '1:15'],
  ['Milestones', 'Recording, mix & master, artwork, release. Each finished stage unlocks its slice after a holder vote.', '3:08'],
  ['Release', 'The record drops. Pass holders hear it first, collect their perks, and keep the proof forever.', '2:27'],
]

const TIERS = [
  { name: 'Bronze', perks: ['Early listen before release', 'Name in the digital liner notes'], note: 'Compressed NFT on Solana · near-zero fee' },
  { name: 'Silver', perks: ['Everything in Bronze', 'Exclusive merch drop', 'Priority show tickets'], note: 'Mint on Base or BNB Chain' },
  { name: 'Gold', perks: ['Everything in Silver', 'Studio session invite', 'Backer-only stems'], note: 'Limited per pressing' },
]

function Record() {
  const rings = ['Release', 'Artwork', 'Mix & master', 'Recording']
  return (
    <div className="record-wrap" aria-hidden>
      <svg viewBox="0 0 400 400" className="record">
        <defs>
          <radialGradient id="sheen" cx="35%" cy="30%" r="70%">
            <stop offset="0" stopColor="#3a332e" />
            <stop offset=".6" stopColor="#141110" />
            <stop offset="1" stopColor="#0a0908" />
          </radialGradient>
          {rings.map((_, i) => <path key={i} id={`r${i}`} d={`M200,200 m-${150 - i * 26},0 a${150 - i * 26},${150 - i * 26} 0 1,1 ${2 * (150 - i * 26)},0 a${150 - i * 26},${150 - i * 26} 0 1,1 -${2 * (150 - i * 26)},0`} />)}
        </defs>
        <circle cx="200" cy="200" r="196" fill="url(#sheen)" />
        {Array.from({ length: 34 }, (_, i) => <circle key={i} cx="200" cy="200" r={70 + i * 3.8} fill="none" stroke="#000" strokeOpacity={i % 7 === 0 ? 0.9 : 0.35} strokeWidth={i % 7 === 0 ? 2 : 0.6} />)}
        {rings.map((t, i) => (
          <text key={t} className="groove-label"><textPath href={`#r${i}`} startOffset={`${8 + i * 9}%`}>{String(4 - i).padStart(2, '0')} · {t.toUpperCase()}</textPath></text>
        ))}
        <circle cx="200" cy="200" r="58" fill="var(--accent)" />
        <text x="200" y="196" textAnchor="middle" className="label-big">MUSIZ</text>
        <text x="200" y="214" textAnchor="middle" className="label-small">33⅓ · SIDE A</text>
        <circle cx="200" cy="200" r="4" fill="var(--ink)" />
      </svg>
      <svg viewBox="0 0 200 300" className="tonearm">
        <circle cx="150" cy="40" r="22" fill="#2a2522" stroke="#4a423c" />
        <path d="M150 40 L120 220 L92 262" stroke="#c9c0b3" strokeWidth="6" fill="none" strokeLinecap="round" />
        <rect x="78" y="254" width="30" height="18" rx="3" transform="rotate(-30 93 263)" fill="#c9c0b3" />
      </svg>
    </div>
  )
}

function TokenRow({ m }: { m: Market }) {
  const [copied, setCopied] = useState(false)
  const live = m.priceUsd != null
  return (
    <div className="trow">
      <div className="tnet">{m.network.name}</div>
      {m.address ? (
        <button className="ca" title="Copy contract address" onClick={() => { navigator.clipboard.writeText(m.address); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>
          {copied ? 'Copied' : short(m.address)}
        </button>
      ) : <span className="muted">CA soon</span>}
      <div className="num">{live ? usd(m.priceUsd) : '—'}</div>
      <div className={`num ${m.change24h != null ? (m.change24h >= 0 ? 'up' : 'down') : ''}`}>{m.change24h != null ? `${m.change24h > 0 ? '+' : ''}${m.change24h.toFixed(1)}%` : '—'}</div>
      <div className="num">{usd(m.liquidityUsd)}</div>
      <div className="num">{usd(m.volume24h)}</div>
      <div className="links">
        {m.pairUrl && <a href={m.pairUrl} target="_blank" rel="noreferrer">Chart</a>}
        {m.address && m.network.explorer && <a href={m.network.explorer + m.address} target="_blank" rel="noreferrer">Explorer</a>}
      </div>
    </div>
  )
}

export default function App() {
  const [open, setOpen] = useState(false)
  const evm = useAccount()
  const sol = useWallet()
  const { data: markets, isLoading } = useTokenMarkets()
  const label = [evm.address && short(evm.address), sol.publicKey && short(sol.publicKey.toBase58())].filter(Boolean).join(' / ')

  return (
    <>
      <header className="nav">
        <a href="/" className="logo">musiz<span>.xyz</span></a>
        <nav>
          <a href="#how">How it works</a>
          <a href="#passes">Passes</a>
          <a href="#token">${token.symbol}</a>
          <a href="#drops">Drops</a>
        </nav>
        <button className="btn" onClick={() => setOpen(true)}>{label || 'Connect wallet'}</button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Onchain pressing plant for independent artists</p>
            <h1>Press the record<br /><em>before it exists.</em></h1>
            <p className="lede">Fans fund the album. Smart contracts hold the money. Artists unlock it groove by groove, one finished milestone at a time.</p>
            <div className="cta">
              <a className="btn" href="#buy">Buy ${token.symbol}</a>
              <a className="btn ghost" href={token.x} target="_blank" rel="noreferrer">Apply as artist →</a>
            </div>
            <ul className="chains"><li>Solana</li><li>Base</li><li>BNB Chain</li><li>Robinhood</li></ul>
          </div>
          <Record />
        </section>

        <ContractStrip />

        <section id="how" className="tracklist">
          <div className="side">Side A — How a pressing works</div>
          <ol>
            {STEPS.map(([t, d, len], i) => (
              <li key={t}>
                <span className="no">A{i + 1}</span>
                <div><h3>{t}</h3><p>{d}</p></div>
                <span className="len">{len}</span>
              </li>
            ))}
          </ol>
          <p className="footnote">If a pressing misses its goal or fails a milestone vote, the unreleased balance returns to backers. Artists stake ${token.symbol} to launch, and an abandoned project is slashed to its backers.</p>
        </section>

        <section id="passes" className="passes">
          <div className="side">Side B — Access Passes</div>
          <div className="tickets">
            {TIERS.map((t) => (
              <article key={t.name} className={`ticket ${t.name.toLowerCase()}`}>
                <div className="stub"><span>ADMIT ONE</span><span>{t.name.toUpperCase()}</span></div>
                <div className="tbody">
                  <h3>{t.name}</h3>
                  <ul>{t.perks.map((p) => <li key={p}>{p}</li>)}</ul>
                  <small>{t.note}</small>
                </div>
              </article>
            ))}
          </div>
          <p className="footnote">Paying with ${token.symbol} earns a discount and burns a share of every mint.</p>
        </section>

        <section id="token" className="token">
          <div className="side">The label — ${token.symbol}</div>
          <p className="lede small">One token, bridged across four chains. EVM networks share a single contract address. Live market data from DexScreener, refreshed every minute.</p>
          <div className="table">
            <div className="trow head"><div>Network</div><div>Contract</div><div>Price</div><div>24h</div><div>Liquidity</div><div>Vol 24h</div><div /></div>
            {isLoading ? <div className="trow"><span className="muted">Loading markets…</span></div> : markets?.map((m) => <TokenRow key={m.network.key} m={m} />)}
          </div>
        </section>

        <section id="drops" className="drops">
          <div className="side">Now pressing</div>
          <div className="empty">
            <div className="empty-disc" />
            <h3>The first pressing hasn't dropped yet.</h3>
            <p>Artist campaigns appear here as soon as they go live onchain. Follow <a href={token.x} target="_blank" rel="noreferrer">@MusizXyz</a> for the first drop.</p>
          </div>
        </section>
      </main>

      <footer>
        <span>musiz.xyz · fan-funded music, settled onchain</span>
        <a href={token.x} target="_blank" rel="noreferrer">X / @MusizXyz</a>
      </footer>

      <ConnectModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
