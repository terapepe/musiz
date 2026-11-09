import React from 'react'
import ReactDOM from 'react-dom/client'
import { Providers } from './wallet/Providers'
import App from './App'
import './styles.css'
import { activeNetworks, inkOn, isSingle, names, primary } from './config/chains'

// Per-network look: single mode takes the network color as accent; texts follow active networks
if (isSingle) {
  document.documentElement.style.setProperty('--accent', primary.color)
  document.documentElement.style.setProperty('--accent-ink', inkOn(primary.color))
}
const desc = document.querySelector('meta[name="description"]')
desc?.setAttribute('content', `Fan-funded album launchpad for independent artists. Escrowed pledges, milestone unlocks, Access Pass NFTs on ${names(activeNetworks, 'and')}.`)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers><App /></Providers>
  </React.StrictMode>,
)
