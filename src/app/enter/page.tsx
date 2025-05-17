'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Connection, PublicKey, clusterApiUrl, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Program, BN, AnchorProvider, Idl } from '@project-serum/anchor'
import { useWallet } from '@solana/wallet-adapter-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { Coins, Gift, Trophy, Users } from 'lucide-react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import '@solana/wallet-adapter-react-ui/styles.css'
import { WalletButton } from '@/components/solana/solana-provider'
import dynamic from 'next/dynamic'

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

type Participant = {
  wallet: PublicKey
  tokens: BN
}

type RaffleState = {
  admin: PublicKey
  treasury: PublicKey
  adminAuth1: PublicKey
  adminAuth2: PublicKey
  adminAuth3: PublicKey
  payoutWallet: PublicKey
  totalSol: BN
  thresholdReached: boolean
  winnerSelected: boolean
  winner: PublicKey
  participants: Participant[]
  participantCount: BN
  blacklist: PublicKey[]
}

type RaffleInfo = {
  publicKey: PublicKey
  account: RaffleState
}

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

const programId = new PublicKey('CpG92WPSAiiJLZXdTBGBGzQDoj2NTfsLwUoiaYtqJnx7')
const THRESHOLD_SOL = 1
const THRESHOLD_LAMPORTS = THRESHOLD_SOL * LAMPORTS_PER_SOL

const findTreasuryPDA = (programId: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId)
}

const WalletContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

const RaffleContent: React.FC = () => {
  const wallet = useWallet()
  const [program, setProgram] = useState<Program<Idl> | null>(null)
  const [raffles, setRaffles] = useState<RaffleInfo[]>([])
  const [selectedRaffle, setSelectedRaffle] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [donationAmount, setDonationAmount] = useState(0.01)
  const [completedRaffles, setCompletedRaffles] = useState<RaffleInfo[]>([])

  const fetchRaffleState = useCallback(async () => {
    if (!wallet.connected || !program) return

    try {
      setLoading(true)
      setStatusMessage('Fetching raffle accounts...')

      const accounts = await program.account.raffleState.all()
      const raffleAccounts = accounts.map(acc => ({
        publicKey: acc.publicKey,
        account: acc.account as unknown as RaffleState
      }))

      // Separate active and completed raffles
      const completed = raffleAccounts.filter(r => r.account.winnerSelected)
      const active = raffleAccounts.filter(r => !r.account.winnerSelected)
      
      setRaffles(active)
      setCompletedRaffles(completed)
      
      if (active.length > 0 && !selectedRaffle) {
        setSelectedRaffle(active[0].publicKey.toString())
      }

      setStatusMessage(`Found ${accounts.length} raffle account(s)`)
    } catch (error) {
      console.error('Error fetching raffle state:', error)
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }, [wallet.connected, program])

  const initializeProgram = useCallback(async () => {
    if (!wallet.publicKey) {
      setStatusMessage('Please connect your wallet.')
      return
    }

    try {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
      const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' })
      const program = new Program(idl as Idl, programId, provider)
      setProgram(program)
    } catch (error) {
      console.error('Failed to initialize program:', error)
      setStatusMessage(`Error initializing: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [wallet])

  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      initializeProgram()
    } else {
      setProgram(null)
      setRaffles([])
      setSelectedRaffle(null)
    }
  }, [wallet.connected, wallet.publicKey, initializeProgram])

  useEffect(() => {
    if (program) {
      fetchRaffleState()
      const interval = setInterval(fetchRaffleState, 30000)
      return () => clearInterval(interval)
    }
  }, [program, fetchRaffleState])

  const handleDonate = async () => {
    if (!program || !wallet.publicKey || !selectedRaffle) {
      setStatusMessage('Cannot donate: missing requirements')
      return
    }

    try {
      setLoading(true)
      const amountLamports = donationAmount * LAMPORTS_PER_SOL
      const [treasury] = findTreasuryPDA(programId)

      const tx = await program.methods
        .donate(new BN(amountLamports))
        .accounts({
          raffleState: new PublicKey(selectedRaffle),
          participant: wallet.publicKey,
          treasury: treasury,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      setStatusMessage(`Donated ${donationAmount} SOL! TX: ${tx.substring(0, 8)}...`)
      setTimeout(fetchRaffleState, 2000)
    } catch (error) {
      console.error('Error donating:', error)
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  const formatSOL = (lamports: BN | null | undefined) => {
    if (!lamports) return '0'
    try {
      return (lamports.toNumber() / LAMPORTS_PER_SOL).toFixed(4)
    } catch {
      return 'Amount too large'
    }
  }

  const getCurrentRaffleState = useCallback(() => {
    if (!selectedRaffle) return null
    return raffles.find(r => r.publicKey.toString() === selectedRaffle)?.account || null
  }, [selectedRaffle, raffles])

  const calculateWinProbability = () => {
    const currentRaffle = getCurrentRaffleState()
    if (!currentRaffle || !wallet.publicKey) return '0%'

    const userEntries = currentRaffle.participants?.find(p => p.wallet.equals(wallet.publicKey))
    if (!userEntries) return '0%'

    const userTokens = userEntries.tokens.toNumber()
    const totalTokens = currentRaffle.participants.reduce((sum, p) => sum + p.tokens.toNumber(), 0)

    return totalTokens > 0 ? `${((userTokens / totalTokens) * 100).toFixed(2)}%` : '0%'
  }

  const getProgressPercentage = (totalSol: BN | null | undefined) => {
    if (!totalSol) return 0
    try {
      return Math.min(100, (totalSol.toNumber() / THRESHOLD_LAMPORTS) * 100)
    } catch {
      return 0
    }
  }

  const currentRaffleState = getCurrentRaffleState()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-amber-500" />
                Enter the Raffle
              </CardTitle>
              <CardDescription>
                Join the raffle for a chance to win SOL. The more you contribute, the higher your chance of winning.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!wallet.connected ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center py-12">
                  <p className="mb-4 text-gray-600">Connect your wallet to participate in raffles.</p>
                  <WalletButton />
                </div>
              ) : raffles.length > 0 ? (
                <div className="space-y-6">
                  <div className="mb-6">
                    <Label className="mb-2 block">Select a Raffle</Label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      onChange={(e) => setSelectedRaffle(e.target.value)}
                      value={selectedRaffle || ''}
                    >
                      <option value="">-- Select a raffle --</option>
                      {raffles.map((raffle, idx) => (
                        <option key={raffle.publicKey.toString()} value={raffle.publicKey.toString()}>
                          Raffle #{idx + 1}: {raffle.publicKey.toString().slice(0, 8)}... ({formatSOL(raffle.account.totalSol)} SOL)
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentRaffleState && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>
                            Progress: {formatSOL(currentRaffleState.totalSol)} / {THRESHOLD_SOL} SOL
                          </span>
                          <span>{getProgressPercentage(currentRaffleState.totalSol)}%</span>
                        </div>
                        <Progress value={getProgressPercentage(currentRaffleState.totalSol)} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col items-center rounded-lg border p-4 text-center">
                          <Coins className="mb-2 h-8 w-8 text-primary" />
                          <span className="text-sm text-gray-600">Prize Pot</span>
                          <span className="text-xl font-bold">{formatSOL(currentRaffleState.totalSol)} SOL</span>
                        </div>
                        <div className="flex flex-col items-center rounded-lg border p-4 text-center">
                          <Users className="mb-2 h-8 w-8 text-primary" />
                          <span className="text-sm text-gray-600">Participants</span>
                          <span className="text-xl font-bold">{currentRaffleState.participantCount.toString()}</span>
                        </div>
                      </div>

                      {!currentRaffleState.winnerSelected && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Amount to Contribute (SOL)</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={donationAmount}
                                onChange={(e) => setDonationAmount(parseFloat(e.target.value) || 0)}
                                className="w-full"
                              />
                              <Button onClick={() => setDonationAmount(0.1)} variant="outline" className="px-2">
                                0.1
                              </Button>
                              <Button onClick={() => setDonationAmount(0.5)} variant="outline" className="px-2">
                                0.5
                              </Button>
                              <Button onClick={() => setDonationAmount(1)} variant="outline" className="px-2">
                                1
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500">Each 0.01 SOL = 1 raffle entry ticket</p>
                          </div>

                          <Button
                            className="w-full"
                            size="lg"
                            onClick={handleDonate}
                            disabled={loading || !wallet.connected || donationAmount <= 0}
                          >
                            {loading ? 'Processing...' : 'Enter Raffle'}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="mb-4 text-center">No active raffles found.</div>
                  <div className="text-center text-sm text-gray-500">
                    Check back later for upcoming raffles.
                  </div>
                </div>
              )}
            </CardContent>
            {statusMessage && (
              <CardFooter>
                <div
                  className={`w-full rounded-md p-3 text-sm ${
                    loading
                      ? 'bg-blue-50 text-blue-800'
                      : statusMessage.toLowerCase().includes('error')
                      ? 'bg-red-50 text-red-800'
                      : 'bg-green-50 text-green-800'
                  }`}
                >
                  {statusMessage}
                </div>
              </CardFooter>
            )}
          </Card>
        </div>

        <div className="flex flex-col space-y-6">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-6 w-6 text-green-500" />
                Prize & Winning Chances
              </CardTitle>
              <CardDescription>Details about the raffle prize and your chances of winning.</CardDescription>
            </CardHeader>
            <CardContent>
              {!wallet.connected ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
                  <p className="text-gray-600">Connect your wallet to see your win probability.</p>
                  <WalletMultiButtonDynamic />
                </div>
              ) : currentRaffleState ? (
                <div className="space-y-6">
                  <div className="rounded-lg bg-primary/5 p-4">
                    <h3 className="mb-2 font-semibold">How it works</h3>
                    <ul className="ml-4 list-disc space-y-1 text-sm">
                      <li>For every {THRESHOLD_SOL} SOL collected, a winner is chosen</li>
                      <li>50% of the pot goes to the winner, 50% goes to charity</li>
                      <li>Each 0.01 SOL contribution gives you 1 entry</li>
                      <li>More entries = higher chance of winning</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="mb-2 font-semibold">Potential Win Amount</h3>
                      <div className="text-3xl font-bold text-green-600">
                        {formatSOL(currentRaffleState.totalSol ? new BN(currentRaffleState.totalSol.toNumber() / 2) : new BN(0))} SOL
                      </div>
                      <p className="text-sm text-gray-600">50% of the current pot</p>
                    </div>

                    <div>
                      <h3 className="mb-2 font-semibold">Your Win Probability</h3>
                      <div className="text-3xl font-bold text-blue-600">{calculateWinProbability()}</div>
                      <p className="text-sm text-gray-600">
                        Based on your {donationAmount > 0 ? `${donationAmount} SOL contribution` : 'entries'}
                      </p>
                    </div>
                  </div>

                  {currentRaffleState.winnerSelected && (
                    <div className="rounded-lg bg-amber-50 p-4">
                      <h3 className="mb-2 font-medium text-amber-800">Winner Selected!</h3>
                      <p className="text-sm text-amber-700">
                        Winner: {currentRaffleState.winner.toString().substring(0, 8)}...
                      </p>
                      <p className="text-sm text-amber-700">
                        Prize: {formatSOL(currentRaffleState.totalSol ? new BN(currentRaffleState.totalSol.toNumber() / 2) : new BN(0))} SOL
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  {loading ? <p>Loading raffle data...</p> : <p>Please select a raffle to see details.</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Winners</CardTitle>
              <CardDescription>Previous raffle winners and prize amounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <div className="grid grid-cols-3 border-b p-3 font-medium">
                  <div>Raffle</div>
                  <div>Winner</div>
                  <div className="text-right">Prize</div>
                </div>
                {completedRaffles.length > 0 ? (
                  completedRaffles.map((raffle, index) => (
                    <div
                      key={raffle.publicKey.toString()}
                      className={`grid grid-cols-3 p-3 text-sm ${index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
                    >
                      <div>Raffle #{raffle.publicKey.toString().slice(0, 8)}</div>
                      <div>{raffle.account.winner.toString().slice(0, 8)}...</div>
                      <div className="text-right">
                        {formatSOL(new BN(raffle.account.totalSol.toNumber() / 2))} SOL
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-sm text-gray-500">No completed raffles yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

const RafflePage = () => {
  return (
    <WalletContextProvider>
      <RaffleContent />
    </WalletContextProvider>
  )
}

export default RafflePage