'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Connection, PublicKey, clusterApiUrl, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Program, BN, AnchorProvider, Idl } from '@project-serum/anchor'
import { useWallet } from '@solana/wallet-adapter-react' // Using the standard wallet adapter
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { WalletMultiButton, WalletModalProvider } from '@solana/wallet-adapter-react-ui' // Using the standard wallet connect button
import { Coins, Gift, Trophy, Users } from 'lucide-react'

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import '@solana/wallet-adapter-react-ui/styles.css'

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

// Wrap the RafflePage component with the necessary wallet adapter providers
const WalletContextProvider = ({ children }: { children: React.ReactNode }) => {
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

const RafflePageContent = () => {
  const wallet = useWallet()
  const [program, setProgram] = useState<Program<Idl> | null>(null)
  const [raffleAccounts, setRaffleAccounts] = useState<PublicKey[]>([])
  const [selectedRaffle, setSelectedRaffle] = useState<PublicKey | null>(null)
  const [raffleState, setRaffleState] = useState<RaffleState | null>(null)
  const [donationAmount, setDonationAmount] = useState(0.01)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // Define functions to avoid circular reference issue
  const fetchRaffleState = useCallback(async (raffleAccount: PublicKey, programInstance: Program<Idl> | null) => {
    if (!raffleAccount) return

    const prgInstance = programInstance || program
    if (!prgInstance) return

    try {
      setLoading(true)
      setStatusMessage('Loading raffle data...')

      const state = await prgInstance.account.raffleState.fetch(raffleAccount)
      setRaffleState(state as RaffleState)

      setStatusMessage('Raffle data loaded')
      setLoading(false)
    } catch (error: unknown) {
      console.error('Error fetching raffle state:', error)
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setLoading(false)
    }
  }, [])

  const fetchRaffleAccounts = useCallback(
    async (programInstance: Program<Idl>) => {
      try {
        setLoading(true)
        setStatusMessage('Fetching raffle accounts...')

        const accounts = await programInstance.account.raffleState.all()
        setRaffleAccounts(accounts.map((acc) => acc.publicKey))

        if (accounts.length > 0) {
          // Only update if necessary to prevent infinite loops
          if (!selectedRaffle) {
            setSelectedRaffle(accounts[0].publicKey)
            await fetchRaffleState(accounts[0].publicKey, programInstance)
          } else {
            const isStillValid = accounts.some((acc) => acc.publicKey.equals(selectedRaffle))
            if (!isStillValid) {
              setSelectedRaffle(accounts[0].publicKey)
              await fetchRaffleState(accounts[0].publicKey, programInstance)
            }
          }
        } else if (accounts.length === 0) {
          setRaffleState(null)
        }

        setStatusMessage(`Found ${accounts.length} raffle account(s)`)
        setLoading(false)
      } catch (error: unknown) {
        console.error('Error fetching raffle accounts:', error)
        setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
        setLoading(false)
      }
    },
    [fetchRaffleState], // Remove selectedRaffle from dependencies
  )

  const initializeProgram = useCallback(async () => {
    if (!wallet || !wallet.publicKey) {
      console.log('Wallet not connected, cannot initialize program.')
      setStatusMessage('Please connect your wallet.')
      return
    }

    try {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
      // Use type assertion to satisfy the Wallet interface requirement
      const provider = new AnchorProvider(
        connection,
        wallet as unknown as {
          publicKey: PublicKey
          signTransaction: <T>(tx: T) => Promise<T>
          signAllTransactions: <T>(txs: T[]) => Promise<T[]>
        },
        { commitment: 'confirmed' },
      )
      const program = new Program(idl as Idl, programId, provider)
      setProgram(program)

      // Load raffle accounts
      fetchRaffleAccounts(program)
    } catch (error: unknown) {
      console.error('Failed to initialize program:', error)
      setStatusMessage(`Error initializing: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [wallet, fetchRaffleAccounts])

  useEffect(() => {
    if ((wallet.connected && wallet.publicKey) || wallet.publicKey) {
      console.log('Wallet connected:', wallet.publicKey?.toString())
      setStatusMessage('Wallet connected, initializing...')
      initializeProgram()
    } else {
      console.log('Wallet not connected')
      setProgram(null)
      setRaffleAccounts([])
      setSelectedRaffle(null)
      setRaffleState(null)
    }
  }, [wallet.connected, wallet.publicKey]) // Remove initializeProgram from dependencies

  // Donate to raffle
  const donateToRaffle = async () => {
    if (!program || !wallet || !wallet.publicKey || !selectedRaffle) {
      const missingPieces = []
      if (!program) missingPieces.push('program not initialized')
      if (!wallet || !wallet.publicKey) missingPieces.push('wallet not connected')
      if (!selectedRaffle) missingPieces.push('no raffle selected')

      setStatusMessage(`Cannot donate: ${missingPieces.join(', ')}`)
      return
    }

    try {
      setLoading(true)
      setStatusMessage(`Donating ${donationAmount} SOL...`)

      const amountLamports = donationAmount * LAMPORTS_PER_SOL
      const [treasury] = findTreasuryPDA(programId)
      const publicKey = wallet.publicKey

      // Call the donate instruction
      const tx = await program.methods
        .donate(new BN(amountLamports))
        .accounts({
          raffleState: selectedRaffle,
          participant: publicKey,
          treasury: treasury,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: 'confirmed' })

      setStatusMessage(`Donated ${donationAmount} SOL! TX: ${tx.substring(0, 8)}...`)

      // Refresh the raffle state - use a ref to avoid stale closure issues
      setTimeout(() => {
        if (selectedRaffle) {
          fetchRaffleState(selectedRaffle, null)
        }
      }, 2000)

      setLoading(false)
    } catch (error: unknown) {
      console.error('Error donating:', error)
      let errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Insufficient funds')) {
        errorMessage = 'Insufficient funds to donate. Please add more SOL to your wallet.'
      } else if (errorMessage.includes('User rejected')) {
        errorMessage = 'Transaction was rejected by the wallet.'
      }
      setStatusMessage(`Error: ${errorMessage}`)
      setLoading(false)
    }
  }

  // Format SOL amount from lamports
  const formatSOL = (lamports: BN | null | undefined) => {
    if (!lamports) return '0'
    try {
      return (lamports.toNumber() / LAMPORTS_PER_SOL).toFixed(4)
    } catch {
      return 'Amount too large'
    }
  }

  // Handle selection of a raffle from dropdown
  const handleRaffleSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selected = e.target.value
      if (selected) {
        const pubkey = new PublicKey(selected)
        setSelectedRaffle(pubkey)
        fetchRaffleState(pubkey, null)
      }
    },
    [fetchRaffleState],
  )

  // Calculate progress percentage
  const getProgressPercentage = (totalSol: BN | null | undefined) => {
    if (!totalSol) return 0
    try {
      return Math.min(100, (totalSol.toNumber() / THRESHOLD_LAMPORTS) * 100)
    } catch {
      return 0
    }
  }

  // Calculate winning probability
  const calculateWinProbability = () => {
    if (!raffleState || !raffleState.participants || raffleState.participants.length === 0 || !wallet.publicKey)
      return '0%'

    // Check if user has participated
    const userEntries = raffleState.participants?.find((p) => wallet.publicKey && p.wallet.equals(wallet.publicKey))

    if (userEntries) {
      const userTokens = userEntries.tokens.toNumber()
      let totalTokens = 0

      for (const participant of raffleState.participants) {
        totalTokens += participant.tokens.toNumber()
      }

      if (totalTokens > 0) {
        return ((userTokens / totalTokens) * 100).toFixed(2) + '%'
      }
    }

    return '0%'
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <Card>
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
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="mb-4 text-gray-600">Connect your wallet to participate in raffles.</p>
                  <WalletMultiButton />
                </div>
              ) : raffleAccounts.length > 0 ? (
                <div>
                  <div className="mb-6">
                    <Label className="mb-2 block">Select a Raffle</Label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      onChange={handleRaffleSelect}
                      value={selectedRaffle ? selectedRaffle.toString() : ''}
                    >
                      <option value="">-- Select a raffle --</option>
                      {raffleAccounts.map((acc, idx) => (
                        <option key={idx} value={acc.toString()}>
                          Raffle #{idx + 1}: {acc.toString().substring(0, 8)}...
                        </option>
                      ))}
                    </select>
                  </div>

                  {raffleState && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>
                            Progress: {formatSOL(raffleState?.totalSol)} / {THRESHOLD_SOL} SOL
                          </span>
                          <span>{getProgressPercentage(raffleState?.totalSol)}%</span>
                        </div>
                        <Progress value={getProgressPercentage(raffleState?.totalSol)} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col items-center rounded-lg border p-4 text-center">
                          <Coins className="mb-2 h-8 w-8 text-primary" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Prize Pot</span>
                          <span className="text-xl font-bold">{formatSOL(raffleState?.totalSol)} SOL</span>
                        </div>
                        <div className="flex flex-col items-center rounded-lg border p-4 text-center">
                          <Users className="mb-2 h-8 w-8 text-primary" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Participants</span>
                          <span className="text-xl font-bold">{raffleState?.participantCount.toString()}</span>
                        </div>
                      </div>

                      {!raffleState?.winnerSelected && (
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
                            onClick={donateToRaffle}
                            disabled={loading || !wallet.connected || donationAmount <= 0}
                          >
                            {loading ? 'Processing...' : 'Enter Raffle'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="mb-4 text-center">No active raffles found.</div>
                  <div className="text-center text-sm text-gray-500">
                    Check back later for upcoming raffles or visit the admin page.
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

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-6 w-6 text-green-500" />
                Prize & Winning Chances
              </CardTitle>
              <CardDescription>Details about the raffle prize and your chances of winning.</CardDescription>
            </CardHeader>
            <CardContent>
              {!wallet.connected ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-6 text-center">
                  <p className="text-gray-600">Connect your wallet to enter raffles and see your win probability.</p>
                  <WalletMultiButton />
                </div>
              ) : raffleState ? (
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
                        {formatSOL(raffleState?.totalSol ? new BN(raffleState.totalSol.toNumber() / 2) : new BN(0))} SOL
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

                  {raffleState?.winnerSelected && (
                    <div className="rounded-lg bg-amber-50 p-4">
                      <h3 className="mb-2 font-medium text-amber-800">Winner Selected!</h3>
                      <p className="text-sm text-amber-700">
                        Winner: {raffleState?.winner.toString().substring(0, 8)}...
                      </p>
                      <p className="text-sm text-amber-700">
                        Prize:{' '}
                        {formatSOL(raffleState?.totalSol ? new BN(raffleState.totalSol.toNumber() / 2) : new BN(0))} SOL
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
                {/* This would be populated with actual data in a production app */}
                <div className="grid grid-cols-3 p-3 text-sm">
                  <div>Raffle #3</div>
                  <div>7xGa5...2fHq</div>
                  <div className="text-right">0.5 SOL</div>
                </div>
                <div className="grid grid-cols-3 bg-gray-50 p-3 text-sm dark:bg-gray-800">
                  <div>Raffle #2</div>
                  <div>9rBz4...8mPt</div>
                  <div className="text-right">0.75 SOL</div>
                </div>
                <div className="grid grid-cols-3 p-3 text-sm">
                  <div>Raffle #1</div>
                  <div>3jKs7...1qLp</div>
                  <div className="text-right">0.45 SOL</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

const RafflePage = () => (
  <WalletContextProvider>
    <RafflePageContent />
  </WalletContextProvider>
)

export default RafflePage
