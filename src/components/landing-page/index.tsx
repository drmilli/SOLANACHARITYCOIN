'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BarChartIcon, GiftIcon, UsersIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { Waves } from '../ui/waves'

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
  backgroundColor: string
}

interface PaymentProcessProps {
  step: number
  title: string
  description: string
  backgroundColor: string
}

// Helper function to convert hex to rgba
const hexToRGBA = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const isDarkColor = (hex: string): boolean => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Calculate brightness (YIQ formula)
  return r * 0.299 + g * 0.587 + b * 0.114 < 128
}



const benefits: BenefitProps[] = [
  {
    title: 'Donate',
    description: 'Every $1 you donate = 1 $TFP charity coin.',
    icon: <UsersIcon className="h-6 w-6" />,
    backgroundColor: '#90181b',
  },
  {
    title: 'Receive',
    description:
      'Your coins are delivered to your wallet automatically. We will automatically create a wallet for you if you do not have one.',
    icon: <BarChartIcon className="h-6 w-6" />,
    backgroundColor: '#ebbe1e',
  },
  {
    title: 'Win Prizes',
    description: 'Every 222,222 coins sold triggers a new 50/50 raffle where you could win at least $111,111!',
    icon: <GiftIcon className="h-6 w-6" />,
    backgroundColor: '#00ad61',
  },
]

const paymentProcess: PaymentProcessProps[] = [
  {
    step: 1,
    title: 'Donate for a Chance to Win!',
    description: 'Purchase your Charity Coins for $1 each.',
    backgroundColor: '#00ad61', // Green (inverse sequence from benefits)
  },
  {
    step: 2,
    title: 'Support The Cause',
    description: '50% of all proceeds go directly to supporting Black history education initiatives.',
    backgroundColor: '#ebbe1e', // Yellow (same as benefits)
  },
  {
    step: 3,
    title: 'Win A Prize',
    description: 'Winners are chosen every 222,222 coins that are sold.',
    backgroundColor: '#90181b', // Red (inverse sequence from benefits)
  },
]

function BackgroundWaves() {
  return (
    <div className="absolute inset-0" style={{ zIndex: 1 }}>
      <div className="absolute inset-0">
        <Waves backgroundImage="linear-gradient(to right, #4f46e5, #8b5cf6)" className="w-full h-full" />
      </div>
    </div>
  )
}

export function LandingPage() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<string>('light')

  // Add useEffect to handle client-side hydration
  useEffect(() => {
    setMounted(true)
    if (resolvedTheme) {
      setCurrentTheme(resolvedTheme)
    }
  }, [resolvedTheme])

  return (
    <div className="bg-background text-foreground overflow-hidden">
      <main>
        <div id="hero" className="py-12 relative rounded-lg bg-gray-100 max-w-5xl mx-auto my-4">
          <BackgroundWaves />

          <div className="relative z-10 px-4">
            <div className="flex flex-col items-center gap-4 text-center mx-auto">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900">Support Trade For Peace & Win</h1>

              <p className="text-xl text-gray-800 max-w-xl">
                Join us in our mission to end the war in the Middle East. <br />
                Every SOL you donate helps build the peace and gives you entries into our 50/50 raffles! A winner
                is chosen after the 1 SOL donation threshold is met.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Button
                  size="lg"
                  className="text-lg bg-black hover:bg-gray-900 text-white font-medium shadow-sm hover:shadow-md transition-all duration-300 min-w-[200px]"
                >
                  <Link href="/enter" className="flex items-center justify-center w-full">
                    Donate for a Chance to Win
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div id="about" className="py-12 bg-accent/5 max-w-5xl mx-auto my-4 rounded-lg">
          <div className="grid md:grid-cols-2 gap-8 items-center px-4">
            <div>
              <h2 className="text-3xl font-bold mb-6">About Trade for Peace</h2>
              <p className="text-muted-foreground mb-4">
                A Call to End the War in the Middle East <br /> We believe in a world where dialogue triumphs over destruction. <br /> Trade for Peace is a global movement calling for an end to the bloodshed in the Middle East. We advocate for lasting peace, humanitarian aid, economic cooperation, and the protection of every innocent life—regardless of nationality, race, or religion.
              </p>
              <p className="text-muted-foreground mb-6">
               We advocate for lasting peace, humanitarian aid, economic cooperation, and the protection of every innocent life—regardless of nationality, race, or religion.
              </p>
              <div className="flex gap-4">
                <Button variant="outline">
                  <Link href={''}> Our Charity</Link>
                </Button>
                <Button variant="ghost">
                  <Link href={''}> Our Why</Link>
                </Button>
              </div>
            </div>
            <div className="w-full h-auto aspect-square max-w-xl mx-auto rounded-lg">
              {mounted ? (
                <Image
                  src={currentTheme === 'dark' ? '/TFPbr.png' : '/TFPbr.png'}
                  alt="TBHF image"
                  className="w-full h-full object-cover"
                  width={500}
                  height={500}
                  priority
                />
              ) : (
                // Fallback for server-side rendering
                <div className="w-full h-full bg-gray-200" />
              )}
            </div>
          </div>
        </div>

        <div id="benefits" className="py-12 max-w-5xl mx-auto my-4">
          <div className="px-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">How it works</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Support humanitarian organizations working directly in Gaza, Israel, Yemen, Syria, and beyond.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: hexToRGBA(benefit.backgroundColor, 0.3) }}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: benefit.backgroundColor,
                          color: isDarkColor(benefit.backgroundColor) ? 'white' : '#050505',
                        }}
                      >
                        {benefit.icon}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: benefit.backgroundColor }}>
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          id="how-it-works"
          className="py-12 bg-gradient-to-br from-accent/10 to-secondary/10 max-w-5xl mx-auto my-4 rounded-lg"
        >
          <div className="px-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Payment Process</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our 50/50 raffle is simple to enter and supports a great cause.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {paymentProcess.map((process, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: hexToRGBA(process.backgroundColor, 0.3) }}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: process.backgroundColor,
                          color: isDarkColor(process.backgroundColor) ? 'white' : '#050505',
                        }}
                      >
                        <span className="text-2xl font-bold">{process.step}</span>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: process.backgroundColor }}>
                    {process.title}
                  </h3>
                  <p className="text-muted-foreground">{process.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="py-12 max-w-5xl mx-auto my-4">
          <div className="bg-card border rounded-lg p-6 mx-4">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">Why donate?</h2>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground mb-4">
                  <li>Add your name to the global call for an immediate ceasefire and long-term peace process.</li>
                  <li>Receive $TFP Charity Coins as a thank-you gift.</li>
                  <li>
                    Lifetime eligibility for future raffle drawings, so the more you hold, the better your chances.
                  </li>
                  <li>Transparent, fair, and verifiable raffle drawings.</li>
                </ul>
                <Link href="/enter">
                  <Button size="lg" className="text-lg">
                    Buy $TFP Coins
                  </Button>
                </Link>
              </div>
              <div>
                <div className="bg-background p-4 rounded-lg">
                  <h3 className="text-xl font-bold mb-3">Recent Participants</h3>
                  <div className="space-y-4">
                    {participants.map((participant, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full">
                          {mounted && (
                            <Image src={participant.image} alt={participant.name} fill className="object-cover" />
                          )}
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
      </main>
    </div>
  )
}
