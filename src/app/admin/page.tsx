'use client'

import React from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import AdminDashboard from '@/components/admin/dashboard'

import '@solana/wallet-adapter-react-ui/styles.css'

const WalletContextProvider = ({ children }) => {
  const network = 'devnet'
  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
  const endpoint = clusterApiUrl(network)

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

const Page = () => {
  return (
    <WalletContextProvider>
      <AdminDashboard />
    </WalletContextProvider>
  )
}

export default Page
