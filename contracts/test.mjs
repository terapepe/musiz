// End-to-end test on an in-process EVM (ganache). Test-only ERC-20 is compiled inline.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import assert from 'assert/strict'
import { createRequire } from 'module'
import ganache from 'ganache'
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, createPublicClient, custom, parseUnits, decodeEventLog } from 'viem'
const require = createRequire(import.meta.url)
const solc = require('solc')
const here = path.dirname(fileURLToPath(import.meta.url))

const tokenSrc = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract TestToken is ERC20 { constructor() ERC20("Test","TST") { _mint(msg.sender, 1e27); } }`
const out = JSON.parse(solc.compile(JSON.stringify({
  language: 'Solidity', sources: { 'T.sol': { content: tokenSrc } },
  settings: { evmVersion: 'paris', outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } },
}), { import: (p) => ({ contents: fs.readFileSync(path.join(here, 'node_modules', p), 'utf8') }) }))
const T = out.contracts['T.sol'].TestToken
const M = JSON.parse(fs.readFileSync(path.join(here, 'build/MusizMusic.json'), 'utf8'))

const provider = ganache.provider({ logging: { quiet: true }, chain: { chainId: 1337, hardfork: 'shanghai' }, wallet: { totalAccounts: 4, deterministic: true } })
const transport = custom(provider)
const chain = { id: 1337, name: 'ganache', nativeCurrency: { name: 'E', symbol: 'E', decimals: 18 }, rpcUrls: { default: { http: [] } } }
const pub = createPublicClient({ chain, transport })
const keys = Object.values(provider.getInitialAccounts()).map((a) => privateKeyToAccount(a.secretKey))
const [owner, treasury, artist, fan] = keys.map((k) => k.address)
const acct = Object.fromEntries(keys.map((k) => [k.address, k]))
const w = (account) => createWalletClient({ chain, transport, account: acct[account] })

async function deploy(abi, bytecode, args = [], from = owner) {
  const hash = await w(from).deployContract({ abi, bytecode: bytecode.startsWith('0x') ? bytecode : '0x' + bytecode, args })
  return (await pub.waitForTransactionReceipt({ hash })).contractAddress
}
const send = async (from, address, abi, functionName, args) => {
  const hash = await w(from).writeContract({ address, abi, functionName, args })
  const r = await pub.waitForTransactionReceipt({ hash })
  assert.equal(r.status, 'success', functionName)
  return r
}
const read = (address, abi, functionName, args = []) => pub.readContract({ address, abi, functionName, args })
const reverts = async (p, name) => { try { await p; assert.fail('expected revert ' + name) } catch (e) { assert.match(String(e.message + e.shortMessage + JSON.stringify(e.cause?.data ?? '')), new RegExp(name + '|revert'), name) } }

const tok = await deploy(T.abi, T.evm.bytecode.object)
const one = parseUnits('1', 18)
// burn 2%, fee 3%, artist must hold 1,000
const music = await deploy(M.abi, M.bytecode, [tok, owner, treasury, 200, 300, 1000n * one])

// artist without tokens cannot create
await reverts(w(artist).writeContract({ address: music, abi: M.abi, functionName: 'createTrack', args: ['Song', 'ipfs://img', 'ipfs://a', one, 10n] }), 'NotEnoughHeld')

await send(owner, tok, T.abi, 'transfer', [artist, 1000n * one])
await send(owner, tok, T.abi, 'transfer', [fan, 10_000n * one])
const r = await send(artist, music, M.abi, 'createTrack', ['My "First" Song', 'ipfs://cover', 'ipfs://audio', 100n * one, 3n])
const ev = decodeEventLog({ abi: M.abi, ...r.logs[0] })
assert.equal(ev.eventName, 'TrackCreated'); assert.equal(ev.args.id, 0n)

// fan buys 2 editions → 200 tokens: 4 burned, 6 fee, 190 artist
await send(fan, tok, T.abi, 'approve', [music, 200n * one])
await send(fan, music, M.abi, 'mint', [0n, 2n])
assert.equal(await read(tok, T.abi, 'balanceOf', ['0x000000000000000000000000000000000000dEaD']), 4n * one)
assert.equal(await read(tok, T.abi, 'balanceOf', [treasury]), 6n * one)
assert.equal(await read(tok, T.abi, 'balanceOf', [artist]), 1190n * one)
assert.equal(await read(music, M.abi, 'balanceOf', [fan, 0n]), 2n)

// max supply 3 → buying 2 more fails
await send(fan, tok, T.abi, 'approve', [music, 200n * one])
await reverts(w(fan).writeContract({ address: music, abi: M.abi, functionName: 'mint', args: [0n, 2n] }), 'SoldOut')

// only the artist can reprice
await reverts(w(fan).writeContract({ address: music, abi: M.abi, functionName: 'setTrackPrice', args: [0n, 1n] }), 'NotArtist')

// fee cap 30%
await reverts(w(owner).writeContract({ address: music, abi: M.abi, functionName: 'setConfig', args: [treasury, 2000, 1500, 0n] }), 'FeesTooHigh')

// metadata JSON is valid even with quotes in the name
const u = await read(music, M.abi, 'uri', [0n])
const meta = JSON.parse(Buffer.from(u.split(',')[1], 'base64').toString())
assert.equal(meta.name, 'My "First" Song'); assert.equal(meta.animation_url, 'ipfs://audio')

const [list, ids] = await read(music, M.abi, 'getTracks', [0n, 20n])
assert.equal(list.length, 1); assert.equal(ids[0], 0n); assert.equal(list[0].minted, 2n)
console.log('all MusizMusic tests passed')
process.exit(0)
