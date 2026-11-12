import { useState } from 'react'
import { erc20Abi, formatUnits, keccak256, parseUnits, toHex, type Address } from 'viem'
import { useAccount, useConfig, useReadContract, useReadContracts, useSwitchChain, useWriteContract } from 'wagmi'
import { readContract, waitForTransactionReceipt } from 'wagmi/actions'
import token from '../config/token.json'
import { activeEvm, caOf, type Network } from '../config/chains'
import { musicAbi } from '../config/musicAbi'

const SYM = token.symbol
const MUSIC = (token as { music?: Record<string, string> }).music || {}
const GW = (token as { ipfsGateway?: string }).ipfsGateway || 'https://ipfs.io/ipfs/'
const musicOf = (n: Network) => ((MUSIC[n.key] || '').trim() as Address) || undefined

// ipfs://CID/x → gateway, ar://ID → arweave.net
export const media = (u: string) =>
  u.startsWith('ipfs://') ? GW + u.slice(7).replace(/^ipfs\//, '') : u.startsWith('ar://') ? 'https://arweave.net/' + u.slice(5) : u

const NOT_LIVE = 'Opens when the music contract is live.'

const fmt = (v: bigint, d: number) => Number(formatUnits(v, d)).toLocaleString('en', { maximumFractionDigits: 4 })

type Track = { artist: Address; maxSupply: bigint; price: bigint; minted: bigint; name: string; image: string; audio: string }

/** Approve the pay token if needed, then run `action`. Switches chain first. */
function useTokenTx(n: Network, spender: Address) {
  const config = useConfig()
  const { address, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  async function run(label: string, needApprove: bigint, call: () => Promise<`0x${string}`>) {
    setErr('')
    try {
      if (chainId !== n.chainId) { setBusy('Switching network…'); await switchChainAsync({ chainId: n.chainId }) }
      if (needApprove > 0n && address) {
        const allowance = await readContract(config, { chainId: n.chainId, address: caOf(n) as Address, abi: erc20Abi, functionName: 'allowance', args: [address, spender] })
        if (allowance < needApprove) {
          setBusy(`Approve ${SYM}…`)
          const h = await writeContractAsync({ chainId: n.chainId, address: caOf(n) as Address, abi: erc20Abi, functionName: 'approve', args: [spender, needApprove] })
          await waitForTransactionReceipt(config, { chainId: n.chainId, hash: h })
        }
      }
      setBusy(label)
      await waitForTransactionReceipt(config, { chainId: n.chainId, hash: await call() })
      setBusy('')
      return true
    } catch (e) {
      setBusy('')
      setErr(((e as { shortMessage?: string }).shortMessage || (e as Error).message).split('\n')[0])
      return false
    }
  }
  return { run, busy, err, writeContractAsync, address }
}

function TrackCard({ n, music, id, t, decimals, onDone, preview }: { n: Network; music: Address; id: bigint; t: Track; decimals: number; onDone: () => void; preview?: boolean }) {
  const [qty, setQty] = useState(1)
  const tx = useTokenTx(n, music)
  const soldOut = t.maxSupply > 0n && t.minted >= t.maxSupply
  const left = t.maxSupply > 0n ? Number(t.maxSupply - t.minted) : Infinity
  const total = t.price * BigInt(qty)

  const [note, setNote] = useState('')
  const buy = () => preview ? setNote(NOT_LIVE) : tx.run('Minting…', total, () =>
    tx.writeContractAsync({ chainId: n.chainId, address: music, abi: musicAbi, functionName: 'mint', args: [id, BigInt(qty)] }),
  ).then((ok) => ok && onDone())

  return (
    <article className="track">
      <div className="track-cover" style={{ backgroundImage: `url("${media(t.image)}")` }}>
        <span className="track-id">#{id.toString()}</span>
      </div>
      <div className="track-body">
        <h3>{t.name}</h3>
        <p className="track-artist" title="Artist"><code>{t.artist}</code></p>
        {t.audio && <audio controls preload="none" src={media(t.audio)} />}
        <div className="track-meta">
          <span><b>{fmt(t.price, decimals)}</b> {SYM}</span>
          <span>{t.minted.toString()}{t.maxSupply > 0n ? ` / ${t.maxSupply}` : ''} minted</span>
        </div>
        {tx.address || preview ? (
          <div className="track-buy">
            <input type="number" min={1} max={Math.min(left, 100)} value={qty} disabled={soldOut}
              onChange={(e) => setQty(Math.max(1, Math.min(Number(e.target.value) || 1, left, 100)))} />
            <button className="btn" disabled={soldOut || !!tx.busy} onClick={buy}>
              {soldOut ? 'Sold out' : tx.busy || `Mint · ${fmt(total, decimals)} ${SYM}`}
            </button>
          </div>
        ) : <p className="muted">Connect an EVM wallet to mint.</p>}
        {(tx.err || note) && <p className="err">{tx.err || note}</p>}
      </div>
    </article>
  )
}

function CreateTrack({ n, music, decimals, minHold, burnBps, feeBps, onDone, preview }: { n: Network; music: Address; decimals: number; minHold: bigint; burnBps: number; feeBps: number; onDone: () => void; preview?: boolean }) {
  const tx = useTokenTx(n, music)
  const [f, setF] = useState({ name: '', image: '', audio: '', price: '', max: '' })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  const { data: bal } = useReadContract({ chainId: n.chainId, address: caOf(n) as Address, abi: erc20Abi, functionName: 'balanceOf', args: tx.address ? [tx.address] : undefined, query: { enabled: !!tx.address, refetchInterval: 15_000 } })
  const [note, setNote] = useState('')
  const enough = preview || (bal != null && bal >= minHold)
  const valid = f.name.trim() && f.image.trim() && f.audio.trim() && f.price !== '' && Number(f.price) >= 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    if (preview) { setNote(NOT_LIVE); return }
    tx.run('Creating track…', 0n, () =>
      tx.writeContractAsync({ chainId: n.chainId, address: music, abi: musicAbi, functionName: 'createTrack',
        args: [f.name.trim(), f.image.trim(), f.audio.trim(), parseUnits(f.price, decimals), BigInt(f.max || 0)] }),
    ).then((ok) => { if (ok) { setF({ name: '', image: '', audio: '', price: '', max: '' }); onDone() } })
  }

  return (
    <form className="create" onSubmit={submit}>
      <h3>Press a track</h3>
      <p className="muted">Hold at least <b>{fmt(minHold, decimals)} {SYM}</b> to create. Each sale: {burnBps / 100}% burned, {feeBps / 100}% platform fee, {100 - (burnBps + feeBps) / 100}% to you, paid in {SYM}.</p>
      <label>Track name<input value={f.name} onChange={set('name')} maxLength={120} required /></label>
      <label>Cover image URL<input value={f.image} onChange={set('image')} placeholder="ipfs://… or ar://… or https://…" required /></label>
      <label>Audio file URL<input value={f.audio} onChange={set('audio')} placeholder="ipfs://… or ar://… or https://…" required /></label>
      <div className="row2">
        <label>Price ({SYM})<input type="number" min="0" step="any" value={f.price} onChange={set('price')} required /></label>
        <label>Max editions · 0 = open<input type="number" min="0" step="1" value={f.max} onChange={set('max')} placeholder="0" /></label>
      </div>
      {f.image && <img className="create-preview" src={media(f.image)} alt="" />}
      {f.audio && <audio controls preload="none" src={media(f.audio)} />}
      {!tx.address && !preview ? <p className="muted">Connect an EVM wallet to create.</p> : (
        <>
          {tx.address && <p className="muted">Your balance: <b>{bal != null ? fmt(bal, decimals) : '…'} {SYM}</b></p>}
          <button className="btn" disabled={!valid || !enough || !!tx.busy}>{tx.busy || (enough ? 'Create music NFT' : `Need ${fmt(minHold, decimals)} ${SYM}`)}</button>
        </>
      )}
      {(tx.err || note) && <p className="err">{tx.err || note}</p>}
    </form>
  )
}

function NetworkMusic({ n }: { n: Network }) {
  const music = musicOf(n)!
  const c = { chainId: n.chainId, address: music, abi: musicAbi } as const
  const { data: cfg } = useReadContracts({ contracts: [
    { ...c, functionName: 'burnBps' }, { ...c, functionName: 'feeBps' }, { ...c, functionName: 'minHold' },
    { chainId: n.chainId, address: caOf(n) as Address, abi: erc20Abi, functionName: 'decimals' },
  ] })
  const { data: page, refetch, isLoading, error } = useReadContract({ ...c, functionName: 'getTracks', args: [0n, 48n] })
  const [burnBps, feeBps, minHold, decimals] = (cfg || []).map((r) => r.result) as [number?, number?, bigint?, number?]
  const ready = decimals != null && minHold != null && burnBps != null && feeBps != null
  const [tracks, ids] = (page as [Track[], bigint[]] | undefined) || [[], []]

  return (
    <div className="music-grid">
      <div className="tracks">
        {error ? <p className="err">Could not read the music contract on {n.name}.</p>
          : isLoading || !ready ? <p className="muted">Loading tracks from {n.name}…</p>
          : tracks.length ? tracks.map((t, i) => <TrackCard key={ids[i].toString()} n={n} music={music} id={ids[i]} t={t} decimals={decimals!} onDone={refetch} />)
          : <div className="empty small"><div className="empty-disc" /><h3>No tracks pressed on {n.name} yet.</h3><p>Be the first artist to press one.</p></div>}
      </div>
      {ready && <CreateTrack n={n} music={music} decimals={decimals!} minHold={minHold!} burnBps={burnBps!} feeBps={feeBps!} onDone={refetch} />}
    </div>
  )
}

// Shown until the music contract is deployed: same components, no chain reads or writes
const cover = (a: string, b: string) =>
  'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/><circle cx="50" cy="50" r="30" fill="#0e0c0b"/><circle cx="50" cy="50" r="9" fill="${a}"/></svg>`)
const SAMPLE: [string, string, string, number, number, number][] = [
  ['Late Night Pressing', '#ff5a1f', '#2a1a12', 25_000, 0, 100],
  ['Side A, Track 1', '#CCFF00', '#1a2a12', 60_000, 0, 0],
  ['Basement Tapes', '#9945FF', '#12122a', 150_000, 0, 50],
  ['Low Tide', '#0052FF', '#0e1a2a', 300_000, 0, 25],
]
function PreviewMusic({ n }: { n: Network }) {
  const one = 10n ** 18n
  const tracks: Track[] = SAMPLE.map(([name, a, b, price, minted, max]) => ({
    name, image: cover(a, b), audio: '', price: BigInt(price) * one, minted: BigInt(minted), maxSupply: BigInt(max),
    artist: keccak256(toHex(name)).slice(0, 42) as Address,
  }))
  const zero = '0x0000000000000000000000000000000000000000' as Address
  return (
    <div className="music-grid">
      <div className="tracks">{tracks.map((t, i) => <TrackCard key={i} n={n} music={zero} id={BigInt(tracks.length - 1 - i)} t={t} decimals={18} onDone={() => {}} preview />)}</div>
      <CreateTrack n={n} music={zero} decimals={18} minHold={1000n * one} burnBps={200} feeBps={300} onDone={() => {}} preview />
    </div>
  )
}

export function MusicSection() {
  const [tab, setTab] = useState(activeEvm[0]?.key)
  const n = activeEvm.find((x) => x.key === tab)

  return (
    <section id="music" className="music">
      <div className="side">Music NFTs — powered by ${SYM}</div>
      <p className="lede small">Artists press tracks as NFTs priced in ${SYM}. Fans mint editions, every sale burns ${SYM} and pays the artist instantly, onchain.</p>
      {!activeEvm.length ? <p className="muted">Music NFTs run on EVM networks. Switch token.json to an EVM network to enable them.</p> : (
        <>
          {activeEvm.length > 1 && (
            <div className="tabs">{activeEvm.map((x) => (
              <button key={x.key} className={x.key === tab ? 'on' : ''} onClick={() => setTab(x.key)}><img src={x.icon} alt="" /> {x.name}</button>
            ))}</div>
          )}
          {n && (musicOf(n)
            ? <NetworkMusic key={n.key} n={n} />
            : <PreviewMusic key={n.key} n={n} />)}
        </>
      )}
    </section>
  )
}
