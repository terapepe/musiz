import { useState } from 'react'
import token from '../config/token.json'
import { caGroups, chainCount, inkOn, isSingle, primary } from '../config/chains'

function CopyCA({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)
  if (!address) return <code className="ca-full pending">Contract address coming soon</code>
  return (
    <button
      className="ca-full"
      title="Copy contract address"
      onClick={() => { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
    >
      <code>{address}</code>
      <span className="copy">{copied ? 'Copied ✓' : 'Copy'}</span>
    </button>
  )
}

// "Copy RH/BASE/BSC CA" · "Copy SOL CA" — used in the hero instead of a Buy button
export function CopyCAButtons() {
  const [done, setDone] = useState('')
  const live = caGroups.filter((g) => g.ca)
  if (!live.length) return <button className="btn" disabled>CA coming soon</button>
  return <div className="hero-cas">{live.map((g) => {
    const color = g.nets.length === 1 ? g.nets[0].color : undefined
    return (
      <button key={g.id} className="hero-ca" title={`Copy ${g.tag} CA`}
        onClick={() => { navigator.clipboard.writeText(g.ca); setDone(g.id); setTimeout(() => setDone(''), 1200) }}>
        <span className="hero-ca-tag" style={color ? { background: color, color: inkOn(color) } : undefined}>{g.tag} CA</span>
        <code>{g.ca}</code>
        <span className="copy">{done === g.id ? 'Copied ✓' : 'Copy'}</span>
      </button>
    )
  })}</div>
}

export function ContractStrip() {
  return (
    <section className="cas" id="ca">
      <div className="side">${token.symbol} contract{caGroups.length > 1 ? 's' : ''}</div>
      <div className={`ca-grid${caGroups.length > 1 ? '' : ' one'}`}>
        {caGroups.map((g) => (
          <article key={g.id} className="ca-card" style={{ ['--net' as string]: g.nets.length === 1 ? g.nets[0].color : 'var(--accent)' }}>
            <div className="ca-top">
              <h3>{g.nets.length > 1 ? `One address, ${chainCount(g.nets.length)}` : g.nets[0].name}</h3>
              <ul className="pills">{g.nets.map((n) => <li key={n.key}>{n.name}</li>)}</ul>
            </div>
            {isSingle && primary.tagline && <p className="net-tagline">{primary.tagline}</p>}
            <CopyCA address={g.ca} />
            {g.ca && <div className="buy-row">
              {g.nets.filter((n) => n.explorer).map((n) => (
                <a key={n.key} className="btn ghost" href={n.explorer + g.ca} target="_blank" rel="noreferrer">{n.name} explorer ↗</a>
              ))}
            </div>}
          </article>
        ))}
      </div>
      <p className="footnote">Always verify the contract address here or on <a href={token.x} target="_blank" rel="noreferrer">@{token.x.split('/').pop()}</a>.</p>
    </section>
  )
}
