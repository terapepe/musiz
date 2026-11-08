import { useState } from 'react'
import token from '../config/token.json'
import { activeEvm, activeNetworks, chainCount, uniswapBuy } from '../config/chains'

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

export function ContractStrip() {
  const evm = activeEvm
  const sol = activeNetworks.find((n) => n.vm === 'svm')
  const evmCA = token.evmAddress.trim()
  const solCA = token.solanaAddress.trim()

  return (
    <section className="cas" id="buy">
      <div className="side">Get ${token.symbol}</div>
      <div className={`ca-grid${evm.length && sol ? '' : ' one'}`}>
        {evm.length > 0 && <article className="ca-card evm">
          <div className="ca-top">
            <h3>{evm.length > 1 ? `One address, ${chainCount(evm.length)}` : evm[0].name}</h3>
            <ul className="pills">{evm.map((n) => <li key={n.key}>{n.name}</li>)}</ul>
          </div>
          <CopyCA address={evmCA} />
          <div className="buy-row">
            {evm.map((n) => (
              <a key={n.key} className={`btn ${evmCA ? '' : 'disabled'}`} href={evmCA ? uniswapBuy(n, evmCA) : undefined} target="_blank" rel="noreferrer">
                Buy on {n.name} ↗
              </a>
            ))}
          </div>
        </article>}

        {sol && <article className="ca-card sol">
          <div className="ca-top">
            <h3>Solana</h3>
            <ul className="pills"><li>SPL</li></ul>
          </div>
          <CopyCA address={solCA} />
          <div className="buy-row">
            <a className={`btn ${solCA ? '' : 'disabled'}`} href={solCA ? uniswapBuy(sol, solCA) : undefined} target="_blank" rel="noreferrer">
              Buy on Solana ↗
            </a>
          </div>
        </article>}
      </div>
      <p className="footnote">Always verify the contract address here or on <a href={token.x} target="_blank" rel="noreferrer">@{token.x.split('/').pop()}</a> before buying. Buy links open Uniswap.</p>
    </section>
  )
}
