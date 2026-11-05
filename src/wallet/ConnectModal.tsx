import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletReadyState } from '@solana/wallet-adapter-base'
import { evmChains } from '../config/chains'

export const short = (a?: string) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '')

export function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { connectors, connect, isPending, error } = useConnect()
  const evm = useAccount()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const sol = useWallet()

  if (!open) return null
  const solWallets = sol.wallets.filter(
    (w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable,
  )
  // Hide the generic "Injected" entry when EIP-6963 already found named wallets
  const evmConnectors = connectors.filter((c) => c.id !== 'injected' || connectors.length === 1)

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Connect wallet">
        <div className="modal-head">
          <span>Plug in</span>
          <button className="x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <section>
          <h4>EVM · Base · BNB · Robinhood</h4>
          {evm.isConnected ? (
            <div className="connected">
              <code>{short(evm.address)}</code>
              <select value={evm.chainId} onChange={(e) => switchChain({ chainId: Number(e.target.value) })}>
                {evmChains.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="ghost" onClick={() => disconnect()}>Disconnect</button>
            </div>
          ) : evmConnectors.length ? (
            evmConnectors.map((c) => (
              <button key={c.uid} className="wallet" disabled={isPending} onClick={() => connect({ connector: c })}>
                {c.icon && <img src={c.icon} alt="" />} {c.name}
              </button>
            ))
          ) : (
            <p className="muted">No EVM wallet detected in this browser.</p>
          )}
          {error && <p className="err">{error.message.split('\n')[0]}</p>}
        </section>

        <section>
          <h4>Solana</h4>
          {sol.connected ? (
            <div className="connected">
              <code>{short(sol.publicKey?.toBase58())}</code>
              <span className="muted">{sol.wallet?.adapter.name}</span>
              <button className="ghost" onClick={() => sol.disconnect()}>Disconnect</button>
            </div>
          ) : solWallets.length ? (
            solWallets.map((w) => (
              <button
                key={w.adapter.name}
                className="wallet"
                onClick={async () => {
                  sol.select(w.adapter.name)
                  try { await w.adapter.connect() } catch { /* user rejected */ }
                }}
              >
                <img src={w.adapter.icon} alt="" /> {w.adapter.name}
              </button>
            ))
          ) : (
            <p className="muted">No Solana wallet detected. Install Phantom, Solflare or Backpack.</p>
          )}
        </section>
      </div>
    </div>
  )
}
