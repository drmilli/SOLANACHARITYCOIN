'use client'

import React, { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import dynamic from 'next/dynamic'

const WalletButton = dynamic(
  async () => {
    const DynamicWalletMultiButton = (props: any) => {
      const { connecting } = useWallet()
      const [mounted, setMounted] = useState(false)

      useEffect(() => {
        setMounted(true)
      }, [])

      if (!mounted) return null

      const labels = {
        'change-wallet': 'Change wallet',
        connecting: 'Connecting ...',
        'copy-address': 'Copy address',
        copied: 'Copied',
        disconnect: 'Disconnect',
        'has-wallet': 'Connect',
        'no-wallet': 'Select Wallet',
      }

      return (
        <WalletMultiButton
          {...props}
          disabled={!mounted || connecting}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: !mounted || connecting ? 'not-allowed' : 'pointer',
            backgroundColor: !mounted ? '#ccc' : connecting ? '#666' : '#512da8',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'background-color 0.2s ease',
            ...props.style,
          }}
        />
      )
    }

    return DynamicWalletMultiButton
  },
  { ssr: false }
)

export default WalletButton