// Deploy MusizMusic to one EVM network and save its address into src/config/token.json → music.<network>
//
//   PRIVATE_KEY=0x...  NETWORK=robinhood  TREASURY=0x...  npm run deploy
//
// Optional: RPC_URL, BURN_BPS (default 200 = 2%), FEE_BPS (default 300 = 3%), MIN_HOLD (whole tokens, default 1000)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createPublicClient, createWalletClient, http, erc20Abi, parseUnits, formatEther, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, bsc } from 'viem/chains'

const here = path.dirname(fileURLToPath(import.meta.url))
const cfgPath = path.join(here, '../src/config/token.json')
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))

const robinhood = defineChain({ id: 4663, name: 'Robinhood Chain', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } } })
const CHAINS = { robinhood, base, bsc }

// Load contracts/.env (git-ignored) without overriding variables already set in the shell
const envFile = path.join(here, '.env')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const { PRIVATE_KEY, NETWORK, TREASURY, RPC_URL } = process.env
const chain = CHAINS[NETWORK]
if (!PRIVATE_KEY || !chain || !TREASURY) {
  console.error('Usage: PRIVATE_KEY=0x.. NETWORK=robinhood|base|bsc TREASURY=0x.. [RPC_URL=..] [BURN_BPS=200] [FEE_BPS=300] [MIN_HOLD=1000] npm run deploy')
  process.exit(1)
}
const token = ((cfg.chains?.[NETWORK]?.ca) || cfg.evmAddress || '').trim()
if (!token) { console.error(`No ${cfg.symbol} contract address for ${NETWORK} in token.json`); process.exit(1) }

const transport = http(RPC_URL || chain.rpcUrls.default.http[0])
const pub = createPublicClient({ chain, transport })
// Accept keys with or without 0x, strip spaces/quotes from copy-paste
const key = PRIVATE_KEY.trim().replace(/^["']|["']$/g, '').replace(/^0x/i, '')
if (!/^[0-9a-fA-F]{64}$/.test(key)) {
  console.error(`PRIVATE_KEY must be 64 hex characters (got ${key.length} characters). Copy it again from your wallet: Account details → Show private key.`)
  process.exit(1)
}
const account = privateKeyToAccount(`0x${key}`)
const wallet = createWalletClient({ chain, transport, account })

const decimals = await pub.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' })
const symbol = await pub.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' })
const burnBps = Number(process.env.BURN_BPS ?? 200)
const feeBps = Number(process.env.FEE_BPS ?? 300)
const minHold = parseUnits(String(process.env.MIN_HOLD ?? 1000), decimals)

console.log(`Deploying MusizMusic on ${chain.name}\n  pay token ${symbol} ${token} (${decimals} decimals)\n  owner ${account.address}\n  treasury ${TREASURY}\n  burn ${burnBps / 100}%  fee ${feeBps / 100}%  min hold ${process.env.MIN_HOLD ?? 1000} ${symbol}`)

const { abi, bytecode } = JSON.parse(fs.readFileSync(path.join(here, 'build/MusizMusic.json'), 'utf8'))

// Gas: Arbitrum-style chains cap gas estimates by the sender's balance, so check funds first.
const ethBal = await pub.getBalance({ address: account.address })
const { maxFeePerGas = 0n } = await pub.estimateFeesPerGas().catch(() => ({}))
const gas = process.env.GAS_LIMIT ? BigInt(process.env.GAS_LIMIT) : 20_000_000n
const needed = gas * maxFeePerGas
console.log(`  deployer ETH ${formatEther(ethBal)}  · max gas cost ≈ ${formatEther(needed)} ETH (gas limit ${gas})`)
if (ethBal === 0n || ethBal < needed) {
  console.error(`Not enough ETH on ${chain.name} in ${account.address}. Send at least ${formatEther(needed)} ETH (a little more is safer) and run again.`)
  process.exit(1)
}

const hash = await wallet.deployContract({ abi, bytecode, gas, args: [token, account.address, TREASURY, burnBps, feeBps, minHold] })
console.log('tx', hash)
const { contractAddress, status } = await pub.waitForTransactionReceipt({ hash })
if (status !== 'success') { console.error('deploy failed'); process.exit(1) }

const music = { ...(cfg.music || {}), [NETWORK]: contractAddress }
const raw = fs.readFileSync(cfgPath, 'utf8')
const line = `"music": ${JSON.stringify(music).replace(/,/g, ', ').replace(/:/g, ': ').replace('{', '{ ').replace(/}$/, ' }')}`
fs.writeFileSync(cfgPath, /"music":\s*\{[^}]*\}/.test(raw) ? raw.replace(/"music":\s*\{[^}]*\}/, line) : raw.replace(/\n}\s*$/, `,\n  ${line}\n}\n`))
JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
console.log(`MusizMusic deployed at ${contractAddress} → saved to token.json music.${NETWORK}. Commit and push to publish.`)
