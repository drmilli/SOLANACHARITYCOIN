'use client'

import React, { useState, useEffect, CSSProperties, ButtonHTMLAttributes } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import dynamic from 'next/dynamic'

const WalletButton = dynamic(
  async () => {
    const DynamicWalletMultiButton = (props: ButtonHTMLAttributes<HTMLButtonElement> & { style?: CSSProperties }) => {
      const { connecting } = useWallet()
      const [mounted, setMounted] = useState(false)

      useEffect(() => {
        setMounted(true)
      }, [])

      if (!mounted) return null

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
            ...(props.style || {}),
          }}
        />
      )
    }

    return DynamicWalletMultiButton
  },
  { ssr: false },
)

export default WalletButton
