'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { HeartIcon, BarChartIcon, GiftIcon, UsersIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

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
    description: 'Your coins are delivered to your wallet automatically.',
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isInitialized) return

    const rect = e.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setIsHovering(true)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
  }

  // Generate random plaster elements
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
          }}
        />
      )
    })
  }, [isInitialized])

  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden bg-gray-100"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-200"
        style={{ opacity: isInitialized ? 0.8 : 0, transition: 'opacity 1s ease-out' }}
      />

      {plasterElements}

      <div
        className="absolute inset-0 bg-cover bg-center opacity-0"
        style={{
          backgroundImage:
            "url('https://plus.unsplash.com/premium_photo-1664640458531-3c7cca2a9323?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
        }}
      />

      {isHovering && (
        <div
          className="absolute bg-cover bg-center pointer-events-none"
          style={{
            width: '250px',
            height: '250px',
            borderRadius: '50%',
            top: mousePosition.y - 125,
            left: mousePosition.x - 125,
            backgroundImage:
              "url('https://plus.unsplash.com/premium_photo-1664640458531-3c7cca2a9323?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
            boxShadow: '0 0 20px 5px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.05s ease-out',
          }}
        />
      )}
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1">
        <section className="mx-2 py-12 md:py-24 relative overflow-hidden rounded-2xl bg-gray-100">
          <HoverRevealImage />

          <div className="container relative z-10">
            <div className="flex flex-col items-center gap-6 text-center max-w-3xl mx-auto">
              <Badge variant="outline" className="animate-appear gap-2 bg-black/10 backdrop-blur-sm border-gray-300">
                <span className="text-gray-900 font-medium">Donate and win!</span>
              </Badge>

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
                into our 50/50 raffles! Our goal is to sell 10,000,000,000 coins{' '}
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 mt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button size="lg" className="text-lg bg-black hover:bg-gray-900 text-white">
                  Buy Tickets Now
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
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed vitae justo in odio varius vestibulum.
                  Etiam ac est in nunc convallis ullamcorper nec sit amet eros.
                </p>
                <p className="text-muted-foreground mb-6">
                  Phasellus euismod purus eu velit rhoncus, sit amet tincidunt enim tempor. Aliquam erat volutpat. Proin
                  id eleifend orci, vitae fringilla nulla.
                </p>
                <div className="flex gap-4">
                  <Button variant="outline">Our Mission</Button>
                  <Button variant="ghost">Our Impact</Button>
                </div>
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1531750026848-8ada78f641c2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3"
                  alt="Community event by The Black History Foundation"
                  fill
                  className="object-cover"
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
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center relative z-10">
                          {benefit.icon}
                        </div>
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
              <h2 className="text-3xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our 50/50 raffle is simple to enter and supports a great cause.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-[#9EF8F8]/30 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-[#9EF8F8]/50 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center relative z-10">
                        <span className="text-2xl font-bold text-primary">1</span>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Buy Tickets</h3>
                <p className="text-muted-foreground">
                  Purchase your raffle tickets online. Each ticket costs $10, with bundle discounts available.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-[#9EF8F8]/30 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-[#9EF8F8]/50 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center relative z-10">
                        <span className="text-2xl font-bold text-primary">2</span>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Support the Cause</h3>
                <p className="text-muted-foreground">
                  50% of all proceeds go directly to supporting Black history education initiatives.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-[#9EF8F8]/30 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-[#9EF8F8]/50 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center relative z-10">
                        <span className="text-2xl font-bold text-primary">3</span>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Win Big</h3>
                <p className="text-muted-foreground">
                  Winners are drawn on July 19th. The remaining 50% of proceeds are distributed as prizes.
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
                  <h2 className="text-3xl font-bold mb-4">Ready to Make a Difference?</h2>
                  <p className="text-muted-foreground mb-6">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed
                    cursus ante dapibus diam.
                  </p>
                  <Button size="lg" className="text-lg">
                    Buy Tickets Now
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
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <HeartIcon className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-bold">Black History Foundation</h3>
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
                <li className="text-muted-foreground">(555) 123-4567</li>
                <li className="text-muted-foreground">123 Education Ave, Atlanta, GA 30303</li>
              </ul>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">© 2023 The Black History Foundation. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
