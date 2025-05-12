'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { HeartIcon, BarChartIcon, GiftIcon, UsersIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useTheme } from 'next-themes'

interface ParticipantProps {
  name: string
  image: string
}

const participants: ParticipantProps[] = [
  {
    name: 'Alex Johnson',
    image:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1760&auto=format&fit=crop&ixlib=rb-4.0.3',
  },
  {
    name: 'Maria Rodriguez',
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3',
  },
  {
    name: 'David Chen',
    image:
      'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3',
  },
  {
    name: 'Jasmine Williams',
    image:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1888&auto=format&fit=crop&ixlib=rb-4.0.3',
  },
]

interface BenefitProps {
  title: string
  description: string
  icon: React.ReactNode
}

const benefits: BenefitProps[] = [
  {
    title: 'Donate',
    description: 'Every $1 you donate = 1 $TBHF charity coin.',
    icon: <UsersIcon className="h-6 w-6" />,
  },
  {
    title: 'Receive',
    description: 'Your coins are delivered to your wallet automatically. We’ll automatically create a wallet for you if you don’t have one.',
    icon: <BarChartIcon className="h-6 w-6" />,
  },
  {
    title: 'Win Prizes',
    description: 'Every 222,222 coins sold triggers a new 50/50 raffle where you could win at least $111,111!',
    icon: <GiftIcon className="h-6 w-6" />,
  },
]

function HoverRevealImage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isInitialized, setIsInitialized] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const plasterElements = React.useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => {
      const size = 80 + Math.random() * 100
      const posX = Math.random() * 100
      const posY = Math.random() * 100
      const rotation = Math.random() * 360
      const delay = Math.random() * 0.5
      return (
        <motion.div
          key={i}
          className="absolute bg-white rounded-full"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: isInitialized ? 0.5 : 0 }}
          transition={{ duration: 1.5, delay }}
          style={{
            width: size,
            height: size,
            left: `${posX}%`,
            top: `${posY}%`,
            transform: `rotate(${rotation}deg)`,
            boxShadow: '0 0 20px 5px rgba(255, 255, 255, 0.2) inset',
            filter: 'blur(1px)',
            zIndex: 1,
          }}
        />
      )
    })
  }, [isInitialized])

  // Use a blue-tinted image for better visual effect with the site's color scheme
  const imageUrl =
    "url('https://plus.unsplash.com/premium_photo-1664640458531-3c7cca2a9323?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')"

  // Create a global event handler to capture mouse movements
  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const section = document.querySelector('.hero-section')
      if (!section) return

      const rect = section.getBoundingClientRect()

      // Check if mouse is within the section
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
        setIsHovering(true)
      } else {
        setIsHovering(false)
      }
    }

    // Add global mouse event listener
    document.addEventListener('mousemove', handleGlobalMouseMove)

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [isInitialized])

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
      {/* Base background gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-300"
        style={{
          opacity: isInitialized ? 0.8 : 0,
          transition: 'opacity 1s ease-out',
          zIndex: 0,
        }}
      />

      {/* Background image with very low opacity */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: imageUrl,
          opacity: isInitialized ? 0.15 : 0,
          transition: 'opacity 1s ease-out',
          zIndex: 1,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Plaster elements */}
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        {plasterElements}
      </div>

      {/* Hover reveal spotlight */}
      {isHovering && (
        <div
          className="absolute bg-cover bg-center pointer-events-none"
          style={{
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            top: mousePosition.y - 150,
            left: mousePosition.x - 150,
            backgroundImage: imageUrl,
            boxShadow: '0 0 30px 10px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.05s ease-out',
            opacity: 0.9,
            zIndex: 30,
            pointerEvents: 'none',
            filter: 'brightness(1.1) saturate(1.2)',
          }}
        />
      )}
    </div>
  )
}

export function LandingPage() {
  const { resolvedTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1">
        <section className="mx-2 py-12 md:py-24 relative overflow-hidden rounded-2xl bg-gray-100">
          <HoverRevealImage />

          <div className="container relative z-1">
            <div className="flex flex-col items-center gap-6 text-center max-w-3xl mx-auto">

              <motion.h1
                className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Support Black History & Win
              </motion.h1>

              <motion.p
                className="text-xl max-w-2xl text-gray-800"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                Every $1 you donate helps preserve Black history, gives you a $TBHF charity coin, and a lifetime entry
                into our 50/50 raffles! A winner is chosen every 222,222 coins sold{' '}
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 mt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button 
                  size="lg" 
                  className="text-lg bg-black hover:bg-gray-900 text-white font-medium shadow-sm hover:shadow-md transition-all duration-300 min-w-[200px]"
                >
                  <Link href="/enter" className="flex items-center justify-center w-full">
                    Buy Charity Coins
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg border-2 border-black text-black bg-white hover:bg-black/5 font-medium shadow-sm hover:shadow-md transition-all duration-300 min-w-[200px]"
                >
                  <Link href="https://platform.engiven.com/give/2519/widget/2717" className="flex items-center justify-center w-full">
                    Donate Without Participating
                  </Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="about" className="py-16 bg-accent/5 md:mx-4 lg:mx-12 rounded-md">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">About The Black History Foundation</h2>
                <p className="text-muted-foreground mb-4">
                  The Black History Foundation is a nonprofit organization dedicated to preserving, protecting, and promoting the rich legacy of Black history in America—both physically and digitally.
                </p>
                <p className="text-muted-foreground mb-6">
                  By leveraging technology, we safeguard historical records, stories, and cultural contributions for future generations. Through education, community initiatives, and digital archiving, we ensure that Black history is never lost, forgotten, or erased.
                </p>
                <div className="flex gap-4">
                  <Button variant="outline">
                    <Link href={'https://tbfoundation.org/'}> Our Charity</Link>
                  </Button>
                  <Button variant="ghost">
                    <Link href={'https://www.tbhfdn.org/about'}> Our Why</Link>
                  </Button>
                </div>
              </div>
              <div className="w-full h-auto aspect-square max-w-xl mx-auto overflow-hidden rounded-lg">
                <img
                  src={resolvedTheme === 'dark' ? '/dark_mode_image.png' : '/light_mode_image.png'}
                  alt={`${resolvedTheme} mode image`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="benefits" className="py-16 md:mx-4 lg:mx-24">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">How it works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Your contribution makes a real difference in preserving and promoting Black history.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full bg-[#9EF8F8]/30 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-[#9EF8F8]/50 flex items-center justify-center">
                        {benefit.icon}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="py-16 bg-gradient-to-br from-accent/10 to-secondary/10 md:mx-4 lg:mx-12 rounded-md"
        >
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Payment Process</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our 50/50 raffle is simple to enter and supports a great cause.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-[#9EF8F8]/30 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-[#9EF8F8]/50 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">1</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Buy Charity Coins</h3>
                <p className="text-muted-foreground">
                  Purchase your Charity Coins for $1 each.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-[#9EF8F8]/30 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-[#9EF8F8]/50 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">2</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Support The Cause</h3>
                <p className="text-muted-foreground">
                  50% of all proceeds go directly to supporting Black history education initiatives.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-[#9EF8F8]/30 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-[#9EF8F8]/50 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">3</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Win A Prize</h3>
                <p className="text-muted-foreground">
                  Winners are chosen every 222,222 coins that are sold.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:mx-4 lg:mx-24">
          <div className="container">
            <div className="bg-card border border-border rounded-xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-3xl font-bold mb-4">Why donate?</h2>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground mb-6">
                    <li>Support Black History education, scholarships, and community programs.</li>
                    <li>Receive $TBHF Charity Coins as a thank-you gift.</li>
                    <li>Lifetime eligibility for future raffle drawings, so the more you hold, the better your chances.</li>
                    <li>Transparent, fair, and verifiable raffle drawings.</li>
                  </ul>
                  <Button size="lg" className="text-lg">
                    Buy Charity Coins
                  </Button>
                </div>
                <div>
                  <div className="bg-background p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-4">Recent Participants</h3>
                    <div className="space-y-4">
                      {participants.map((participant, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden">
                            <Image src={participant.image} alt={participant.name} fill className="object-cover" />
                          </div>
                          <div>
                            <p className="font-medium">{participant.name}</p>
                            <p className="text-sm text-muted-foreground">Just entered the raffle</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-12 bg-card/50">
        <div className="container px-6 md:px-8 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <HeartIcon className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-bold">The Black History Foundation</h3>
              </div>
              <p className="text-muted-foreground">
                Supporting education and preservation of Black history for future generations.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Programs
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Events
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Donate
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Raffle Info</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Prizes
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Rules
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Past Winners
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li className="text-muted-foreground">info@blackhistoryfoundation.org</li>
                <li className="text-muted-foreground">661-524-6674</li>
                <li className="text-muted-foreground">30 N. Gould St., STE R, Sheridan, WY 82801</li>
              </ul>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">&copy; 2025 The Black History Foundation. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground/70">Generated by Black History Foundation</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
