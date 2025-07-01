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
    <header className="relative z-50 border-b border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 backdrop-blur-sm shadow-md">
      <div className="mx-auto flex justify-between items-center max-w-7xl px-4 py-3">
        <div className="flex items-center gap-4">
          <Link className="flex items-center hover:opacity-85 transition-all duration-300 hover:scale-[1.02]" href="/">
            <Image src="/TFPbr.png" height={60} width={70} alt="TBHF" className="h-auto w-auto" />
          </Link>
        </div>

        <div className="hidden md:flex items-center justify-center">
          <ul className="flex gap-10 flex-nowrap items-center">
            {links.map(({ label, path }) => (
              <li key={path}>
                <Link
                  className={`relative py-2 font-medium transition-all duration-200 ${
                    isActive(path)
                      ? 'text-black dark:text-white after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:transition-all after:duration-300'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:translate-y-[-1px]'
                  }`}
                  href={path}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden md:flex items-center gap-5">
          <ClusterButton
            size="sm"
            className="shadow hover:shadow-md bg-white dark:bg-neutral-800 border border-gray-200 dark:border-gray-700 rounded-md transition-all duration-200 hover:translate-y-[-1px]"
          />
          <ThemeSelect className="shadow hover:shadow-md bg-white dark:bg-neutral-800 border border-gray-200 dark:border-gray-700 rounded-md transition-all duration-200 hover:translate-y-[-1px]" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors duration-200"
          onClick={() => setShowMenu(!showMenu)}
        >
          {showMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Mobile menu overlay */}
        {showMenu && (
          <div className="md:hidden fixed inset-x-0 top-[57px] bottom-0 bg-white dark:bg-neutral-900 z-40">
            <div className="flex flex-col p-6 gap-6 border-t border-gray-200 dark:border-neutral-800 items-center text-center">
              <ul className="flex flex-col gap-5 w-full">
                {links.map(({ label, path }) => (
                  <li key={path}>
                    <Link
                      className={`block text-lg py-2 font-medium transition-colors ${
                        isActive(path)
                          ? 'text-black dark:text-white'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                      }`}
                      href={path}
                      onClick={() => setShowMenu(false)}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-5 items-center w-full pt-4">
                <WalletButton className="w-full shadow hover:shadow-md bg-white dark:bg-neutral-800 border border-gray-200 dark:border-gray-700 rounded-md" />
                <ClusterButton className="w-full shadow hover:shadow-md bg-white dark:bg-neutral-800 border border-gray-200 dark:border-gray-700 rounded-md" />
                <ThemeSelect className="mt-2 shadow hover:shadow-md bg-white dark:bg-neutral-800 border border-gray-200 dark:border-gray-700 rounded-md" />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
