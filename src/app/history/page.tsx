'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowRight, ExternalLink, Trophy, Calendar, Search } from 'lucide-react'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { Program, AnchorProvider, web3, BN } from '@project-serum/anchor'
import { useWallet, ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'

import '@solana/wallet-adapter-react-ui/styles.css'

// Import the IDL
const idl = {
  version: '0.1.0',
  name: 'raffle',
  instructions: [
    {
      name: 'initialize',
      accounts: [
        { name: 'raffleState', isMut: true, isSigner: true },
        { name: 'admin', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'donate',
      accounts: [
        { name: 'raffleState', isMut: true, isSigner: false },
        { name: 'participant', isMut: true, isSigner: true },
        { name: 'treasury', isMut: true, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [{ name: 'amount', type: 'u64' }],
    },
    {
      name: 'selectWinner',
      accounts: [
        { name: 'raffleState', isMut: true, isSigner: false },
        { name: 'admin', isMut: true, isSigner: true },
        { name: 'treasury', isMut: true, isSigner: false },
        { name: 'winnerAccount', isMut: true, isSigner: false },
        { name: 'recentSlotHash', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'withdrawFunds',
      accounts: [
        { name: 'raffleState', isMut: true, isSigner: false },
        { name: 'admin', isMut: true, isSigner: true },
        { name: 'treasury', isMut: true, isSigner: false },
        { name: 'payoutWallet', isMut: true, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: 'RaffleState',
      type: {
        kind: 'struct',
        fields: [
          { name: 'admin', type: 'publicKey' },
          { name: 'treasury', type: 'publicKey' },
          { name: 'adminAuth1', type: 'publicKey' },
          { name: 'adminAuth2', type: 'publicKey' },
          { name: 'adminAuth3', type: 'publicKey' },
          { name: 'payoutWallet', type: 'publicKey' },
          { name: 'totalSol', type: 'u64' },
          { name: 'thresholdReached', type: 'bool' },
          { name: 'winnerSelected', type: 'bool' },
          { name: 'winner', type: 'publicKey' },
          { name: 'participants', type: { vec: { defined: 'Participant' } } },
          { name: 'participantCount', type: 'u64' },
          { name: 'blacklist', type: { vec: 'publicKey' } },
        ],
      },
    },
  ],
  types: [
    {
      name: 'Participant',
      type: {
        kind: 'struct',
        fields: [
          { name: 'wallet', type: 'publicKey' },
          { name: 'tokens', type: 'u64' },
        ],
      },
    },
  ],
  errors: [
    { code: 6000, name: 'BlacklistedParticipant', msg: 'Participant is blacklisted' },
    { code: 6001, name: 'ThresholdNotReached', msg: 'Threshold not reached' },
    { code: 6002, name: 'WinnerAlreadySelected', msg: 'Winner already selected' },
    { code: 6003, name: 'Unauthorized', msg: 'Unauthorized access' },
  ],
}

// Program ID
const programId = new PublicKey('CpG92WPSAiiJLZXdTBGBGzQDoj2NTfsLwUoiaYtqJnx7')

// Constants
const THRESHOLD_SOL = 1
const THRESHOLD_LAMPORTS = THRESHOLD_SOL * web3.LAMPORTS_PER_SOL

// Wallet context provider
const WalletContextProvider = ({ children }) => {
  const network = 'devnet'
  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
  const endpoint = clusterApiUrl(network)

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

// Find treasury PDA
const findTreasuryPDA = (programId) => {
  return PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId)
}

interface WinnerCardProps {
  raffleId: string
  payoutLink: string
  winner: string
  prize: string
  date?: string
}

const WinnerCard = ({ raffleId, payoutLink, winner, prize, date }: WinnerCardProps) => {
  return (
    <Card className="h-full">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <Badge variant="outline" className="mb-2">
            Raffle ID: {raffleId}
          </Badge>
          <Trophy className="text-amber-500 h-5 w-5" />
        </div>
        <div className="mt-2 mb-4">
          <p className="text-sm text-muted-foreground mb-1">Winner:</p>
          <p className="font-medium truncate">{winner}</p>
          <p className="text-sm text-muted-foreground mt-2 mb-1">Prize:</p>
          <p className="font-medium">{prize} SOL</p>
          {date && (
            <>
              <p className="text-sm text-muted-foreground mt-2 mb-1">Date:</p>
              <p className="font-medium">{date}</p>
            </>
          )}
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

const HistoryPage = () => {
  const wallet = useWallet()
  const [program, setProgram] = useState(null)
  const [raffleAccounts, setRaffleAccounts] = useState([])
  const [completedRaffles, setCompletedRaffles] = useState([])
  const [activeRaffle, setActiveRaffle] = useState(null)
  const [searchValue, setSearchValue] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (wallet && wallet.connected && wallet.publicKey) {
      console.log('Wallet connected:', wallet.publicKey.toString())
      initializeProgram()
    }
  }, [wallet.connected, wallet.publicKey])

  const initializeProgram = () => {
    try {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
      const provider = new AnchorProvider(
        connection,
        wallet,
        { commitment: 'confirmed' }
      )
      const program = new Program(idl, programId, provider)
      setProgram(program)

      // Load raffle accounts
      fetchRaffleAccounts(program)
    } catch (error) {
      console.error('Failed to initialize program:', error)
    }
  }

  const fetchRaffleAccounts = async (programInstance) => {
    try {
      setLoading(true)
      const accounts = await programInstance.account.raffleState.all()
      
      // Set all raffle accounts
      setRaffleAccounts(accounts.map(acc => acc.publicKey))
      
      // Get completed raffles (with winners)
      const completed = accounts
        .filter(acc => acc.account.winnerSelected)
        .map(acc => ({
          id: acc.publicKey.toString().slice(0, 8),
          publicKey: acc.publicKey,
          winner: acc.account.winner.toString(),
          prize: formatSOL(new BN(acc.account.totalSol.toNumber() / 2)),
          payoutLink: `https://explorer.solana.com/address/${acc.account.winner.toString()}?cluster=devnet`
        }))
      
      setCompletedRaffles(completed)
      
      // Get active raffle data
      const active = accounts.find(acc => !acc.account.winnerSelected)
      if (active) {
        setActiveRaffle({
          id: active.publicKey,
          data: active.account,
          progress: calculateProgress(active.account.totalSol)
        })
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching raffle accounts:', error)
      setLoading(false)
    }
  }

  const formatSOL = (lamports) => {
    if (!lamports) return '0'
    try {
      const numberValue = typeof lamports === 'object' && lamports.toNumber 
        ? lamports.toNumber() / web3.LAMPORTS_PER_SOL
        : Number(lamports) / web3.LAMPORTS_PER_SOL
      return numberValue.toFixed(4)
    } catch (e) {
      return 'Amount too large'
    }
  }

  const calculateProgress = (totalSol) => {
    if (!totalSol) return 0
    try {
      return Math.min(100, (totalSol.toNumber() / THRESHOLD_LAMPORTS) * 100)
    } catch (e) {
      return 0
    }
  }

  const getEstimatedDrawDate = () => {
    // This is just a placeholder logic
    // In a real application, you would calculate this based on the rate of contributions and threshold
    const now = new Date()
    now.setDate(now.getDate() + 10) // Adding 10 days as example
    return now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const handleSearch = () => {
    if (!searchValue || !program) return
    
    // Try to match a public key
    try {
      const pubkey = new PublicKey(searchValue)
      
      // Check if this wallet has won any raffle
      const winnerMatches = completedRaffles.filter(raffle => 
        raffle.winner === pubkey.toString()
      )
      
      if (winnerMatches.length > 0) {
        setSearchResults({
          isWinner: true,
          raffles: winnerMatches
        })
      } else {
        setSearchResults({
          isWinner: false,
          message: "This address hasn't won any raffles yet."
        })
      }
    } catch (error) {
      setSearchResults({
        isWinner: false,
        message: "Please enter a valid Solana address."
      })
    }
  }

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
          {completedRaffles.length > 3 && (
            <Button variant="ghost" size="sm" className="gap-2">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        {loading ? (
          <div className="py-20 text-center">
            <p>Loading previous winners...</p>
          </div>
        ) : completedRaffles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {completedRaffles.slice(0, 3).map((raffle) => (
              <WinnerCard 
                key={raffle.id} 
                raffleId={raffle.id} 
                payoutLink={raffle.payoutLink}
                winner={`${raffle.winner.slice(0, 4)}...${raffle.winner.slice(-4)}`}
                prize={raffle.prize}
              />
            ))}
          </div>
        ) : (
          <div className="py-10 text-center border rounded-lg">
            <p className="text-muted-foreground">No raffles have been completed yet.</p>
          </div>
        )}
      </section>

      {/* Next Draw Estimate with Progress Bar */}
      {activeRaffle && (
        <section className="bg-background border rounded-lg p-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Next Draw Estimate</h2>
            </div>
            <Badge variant="outline" className="text-sm">
              {getEstimatedDrawDate()}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{activeRaffle.progress.toFixed(1)}%</span>
            </div>
            <Progress value={activeRaffle.progress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-4">
              The progress bar indicates how close we are to the next raffle draw. Current pool: {formatSOL(activeRaffle.data.totalSol)} SOL / {THRESHOLD_SOL} SOL threshold.
            </p>
          </div>
        </section>
      )}

      {/* Are You a Winner? CTA */}
      <section className="bg-background border rounded-lg p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Are You a Winner?</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
          Enter your wallet address to check if you&apos;ve won in any of our previous raffles.
        </p>
        <div className="flex max-w-md mx-auto">
          <div className="relative flex-1 bg-black border border-gray-700 rounded-l-lg">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Enter wallet address"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-transparent text-gray-300 border-0 focus:ring-0 focus:outline-none"
            />
          </div>
          <button 
            className="rounded-r-lg bg-white text-black hover:bg-gray-100 px-6 py-3"
            onClick={handleSearch}
          >
            Check Now
          </button>
        </div>
        
        {searchResults && (
          <div className="mt-8 p-4 border rounded-lg">
            {searchResults.isWinner ? (
              <div>
                <p className="font-bold text-green-500 mb-4">Congratulations! You've won the following raffles:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.raffles.map(raffle => (
                    <div key={raffle.id} className="border p-4 rounded-lg">
                      <p><span className="font-medium">Raffle ID:</span> {raffle.id}</p>
                      <p><span className="font-medium">Prize:</span> {raffle.prize} SOL</p>
                      <Button size="sm" className="mt-2" asChild>
                        <a href={raffle.payoutLink} target="_blank" rel="noopener noreferrer">
                          View on Explorer
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p>{searchResults.message}</p>
            )}
          </div>
        )}
      </section>

      <section className="bg-background border rounded-lg p-8">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="md:w-2/3">
            <h2 className="text-2xl font-semibold mb-2">Don&apos;t Miss Your Prize!</h2>
            <p className="text-muted-foreground">
              Winners have 30 days to claim their prizes. Make sure to check your account regularly and keep your
              wallet connected.
            </p>
          </div>
          <div className="md:w-1/3 flex justify-center">
            <Button size="lg" className="w-full md:w-auto">
              Connect Wallet
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

const Page = () => {
  return (
    <WalletContextProvider>
      <HistoryPage />
    </WalletContextProvider>
  )
}

export default Page