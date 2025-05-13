'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowRight, ExternalLink, Trophy, Calendar, Search } from 'lucide-react'

interface WinnerCardProps {
  raffleId: string
  payoutLink: string
}

const WinnerCard = ({ raffleId, payoutLink }: WinnerCardProps) => {
  return (
    <Card className="h-full">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <Badge variant="outline" className="mb-2">
            Raffle ID: {raffleId}
          </Badge>
          <Trophy className="text-amber-500 h-5 w-5" />
        </div>
        <div className="mt-auto">
          <Button variant="outline" size="sm" className="w-full mt-4" asChild>
            <a
              href={payoutLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              View Payout <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface HistoryPageProps {
  progressLength?: number
  estimatedDrawDate?: string
  previousWinners?: WinnerCardProps[]
}

const HistoryPage = ({
  progressLength = 65,
  estimatedDrawDate = 'June 15, 2023',
  previousWinners = [
    { raffleId: '8f7d3a2e', payoutLink: '#payout-1' },
    { raffleId: '5e9c2b1d', payoutLink: '#payout-2' },
    { raffleId: '3a7b9c4d', payoutLink: '#payout-3' },
  ],
}: HistoryPageProps) => {
  return (
    <div className="container mx-auto px-4 py-12 space-y-12">
      <section className="bg-background border rounded-lg p-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Raffle History</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          View all previous raffle winners and check if you&apos;ve won in any of our past draws. The next draw is
          coming soon!
        </p>
      </section>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Previous Winners</h2>
          <Button variant="ghost" size="sm" className="gap-2">
            View All <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {previousWinners.map((winner) => (
            <WinnerCard key={winner.raffleId} raffleId={winner.raffleId} payoutLink={winner.payoutLink} />
          ))}
        </div>
      </section>

      {/* 3. Next Draw Estimate with Progress Bar */}
      <section className="bg-background border rounded-lg p-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Next Draw Estimate</h2>
          </div>
          <Badge variant="outline" className="text-sm">
            {estimatedDrawDate}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{progressLength}%</span>
          </div>
          <Progress value={progressLength} className="h-2" />
          <p className="text-sm text-muted-foreground mt-4">
            The progress bar indicates how close we are to the next raffle draw. Stay tuned for updates!
          </p>
        </div>
      </section>

      {/* 4. Are You a Winner? CTA */}
      <section className="bg-background border rounded-lg p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Are You a Winner?</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
          Enter your ticket number or wallet address to check if you&apos;ve won in any of our previous raffles.
        </p>
        <div className="flex max-w-md mx-auto">
          <div className="relative flex-1 bg-black border border-gray-700 rounded-l-lg">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Enter ticket number or wallet address"
              className="w-full pl-12 pr-4 py-3 bg-transparent text-gray-300 border-0 focus:ring-0 focus:outline-none"
            />
          </div>
          <button className="rounded-r-lg bg-white text-black hover:bg-gray-100 px-6 py-3">Check Now</button>
        </div>
      </section>

      <section className="bg-background border rounded-lg p-8">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="md:w-2/3">
            <h2 className="text-2xl font-semibold mb-2">Don&apos;t Miss Your Prize!</h2>
            <p className="text-muted-foreground">
              Winners have 30 days to claim their prizes. Make sure to check your tickets regularly and keep your
              contact information updated.
            </p>
          </div>
          <div className="md:w-1/3 flex justify-center">
            <Button size="lg" className="w-full md:w-auto">
              Set Reminder
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

const Page = () => {
  const length = 75

  return (
    <HistoryPage
      progressLength={length}
      estimatedDrawDate="July 30, 2023"
      previousWinners={[
        { raffleId: '8f7d3a2e', payoutLink: '#payout-1' },
        { raffleId: '5e9c2b1d', payoutLink: '#payout-2' },
        { raffleId: '3a7b9c4d', payoutLink: '#payout-3' },
      ]}
    />
  )
}

export default Page
