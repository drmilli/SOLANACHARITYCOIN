'use client'

import dynamic from 'next/dynamic'
import { ReactNode } from 'react'
import { createSolanaDevnet, createSolanaLocalnet, createWalletUiConfig, WalletUi } from '@wallet-ui/react'
import '@wallet-ui/tailwind/index.css'

// Import the original components with dynamic imports
const OriginalWalletButton = dynamic(async () => (await import('@wallet-ui/react')).WalletUiDropdown, { ssr: false })

const OriginalClusterButton = dynamic(async () => (await import('@wallet-ui/react')).WalletUiClusterDropdown, {
  ssr: false,
})

// Create wrapper components with className support
type WalletButtonProps = {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

type ClusterButtonProps = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showIndicator?: boolean
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
}

// Wrapper components that handle className
export function WalletButton({ className, ...props }: WalletButtonProps) {
  return (
    <div className={className}>
      <OriginalWalletButton {...props} />
    </div>
  )
}

export function ClusterButton({ className, ...props }: ClusterButtonProps) {
  return (
    <div className={className}>
      <OriginalClusterButton {...props} />
    </div>
  )
}

const config = createWalletUiConfig({
  clusters: [createSolanaDevnet(), createSolanaLocalnet()],
})

export function SolanaProvider({ children }: { children: ReactNode }) {
  return <WalletUi config={config}>{children}</WalletUi>
}
