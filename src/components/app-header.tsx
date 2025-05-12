'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { ThemeSelect } from '@/components/theme-select'
import { ClusterButton, WalletButton } from '@/components/solana/solana-provider'
import Image from 'next/image'

export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path)
  }

  return (
    <header className="relative z-50 px-4 py-2 bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-400">
      <div className="mx-auto flex justify-center items-center max-w-7xl">
        <div className="flex-1 flex justify-start items-center gap-4">
          <Link className="text-xl hover:text-neutral-500 dark:hover:text-white" href="/">
            <Image src="/TBHF_Main_Text.png" height={100} width={100} alt="TBHF" />
          </Link>
        </div>

        <div className="flex-2 hidden md:flex items-center justify-center">
          <ul className="flex gap-8 flex-nowrap items-center">
            {links.map(({ label, path }) => (
              <li key={path}>
                <Link
                  className={`hover:text-neutral-500 dark:hover:text-white text-center ${
                    isActive(path) ? 'text-neutral-500 dark:text-white' : ''
                  }`}
                  href={path}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 hidden md:flex items-center justify-end gap-4">
          <WalletButton size="sm" />
          <ClusterButton size="sm" />
          <ThemeSelect />
        </div>

        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowMenu(!showMenu)}>
          {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        {/* Mobile menu overlay */}
        {showMenu && (
          <div className="md:hidden fixed inset-x-0 top-[52px] bottom-0 bg-neutral-100/95 dark:bg-neutral-900/95 backdrop-blur-sm">
            <div className="flex flex-col p-4 gap-4 border-t dark:border-neutral-800 items-center text-center">
              <ul className="flex flex-col gap-4 w-full">
                {links.map(({ label, path }) => (
                  <li key={path}>
                    <Link
                      className={`hover:text-neutral-500 dark:hover:text-white block text-lg py-2 text-center ${
                        isActive(path) ? 'text-neutral-500 dark:text-white' : ''
                      }`}
                      href={path}
                      onClick={() => setShowMenu(false)}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-4 items-center w-full">
                <WalletButton />
                <ClusterButton />
                <ThemeSelect />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
