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
}

const benefits: BenefitProps[] = [
  {
    title: 'Donate',
    description: 'Every $1 you donate = 1 $TBHF charity coin.',
    icon: <UsersIcon className="h-6 w-6" />,
  },
  {
    title: 'Receive',
    description:
      'Your coins are delivered to your wallet automatically. We will automatically create a wallet for you if you do not have one.',
    icon: <BarChartIcon className="h-6 w-6" />,
  },
  {
    title: 'Win Prizes',
    description: 'Every 222,222 coins sold triggers a new 50/50 raffle where you could win at least $111,111!',
    icon: <GiftIcon className="h-6 w-6" />,
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
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900">Support Black History & Win</h1>

              <p className="text-xl text-gray-800 max-w-xl">
                Every SOL you donate helps preserve Black history and gives you entries into our 50/50 raffles! A winner
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
              <h2 className="text-3xl font-bold mb-6">About The Black History Foundation</h2>
              <p className="text-muted-foreground mb-4">
                The Black History Foundation is a nonprofit organization dedicated to preserving, protecting, and
                promoting the rich legacy of Black history in America—both physically and digitally.
              </p>
              <p className="text-muted-foreground mb-6">
                By leveraging technology, we safeguard historical records, stories, and cultural contributions for
                future generations. Through education, community initiatives, and digital archiving, we ensure that
                Black history is never lost, forgotten, or erased.
              </p>
              <div className="flex gap-4">
                <Button variant="outline">
                  <Link href={'https://www.tbhfdn.org'}> Our Charity</Link>
                </Button>
                <Button variant="ghost">
                  <Link href={'https://www.tbhfdn.org/about'}> Our Why</Link>
                </Button>
              </div>
            </div>
            <div className="w-full h-auto aspect-square max-w-xl mx-auto rounded-lg">
              {mounted ? (
                <Image
                  src={currentTheme === 'dark' ? '/dark_mode_image.png' : '/light_mode_image.png'}
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
                Your contribution makes a real difference in preserving and promoting Black history.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 rounded-full bg-[#9EF8F8]/30 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-[#9EF8F8]/50 flex items-center justify-center">
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
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#9EF8F8]/30 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[#9EF8F8]/50 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">1</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Donate for a Chance to Win!</h3>
                <p className="text-muted-foreground">Purchase your Charity Coins for $1 each.</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#9EF8F8]/30 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[#9EF8F8]/50 flex items-center justify-center">
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
                <div className="mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#9EF8F8]/30 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[#9EF8F8]/50 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">3</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Win A Prize</h3>
                <p className="text-muted-foreground">Winners are chosen every 222,222 coins that are sold.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="py-12 max-w-5xl mx-auto my-4">
          <div className="bg-card border rounded-lg p-6 mx-4">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">Why donate?</h2>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground mb-4">
                  <li>Support Black History education, scholarships, and community programs.</li>
                  <li>Receive $TBHF Charity Coins as a thank-you gift.</li>
                  <li>
                    Lifetime eligibility for future raffle drawings, so the more you hold, the better your chances.
                  </li>
                  <li>Transparent, fair, and verifiable raffle drawings.</li>
                </ul>
                <Link href="/enter">
                  <Button size="lg" className="text-lg">
                    Buy Charity Coins
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

      <div className="py-8 border-t max-w-5xl mx-auto px-4 mt-4">
        <div className="flex justify-between items-center flex-wrap">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} The Black History Foundation
          </p>
          <div className="flex gap-4 mt-2 md:mt-0">
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
