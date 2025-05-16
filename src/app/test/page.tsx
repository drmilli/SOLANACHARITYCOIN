'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Connection, PublicKey, clusterApiUrl, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Program, web3, BN, AnchorProvider, Idl } from '@project-serum/anchor'
import { useWallet, ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui'

import '@solana/wallet-adapter-react-ui/styles.css'

// Define types for our program
type Participant = {
  wallet: PublicKey;
  tokens: BN;
};

type RaffleState = {
  admin: PublicKey;
  treasury: PublicKey;
  adminAuth1: PublicKey;
  adminAuth2: PublicKey;
  adminAuth3: PublicKey;
  payoutWallet: PublicKey;
  totalSol: BN;
  thresholdReached: boolean;
  winnerSelected: boolean;
  winner: PublicKey;
  participants: Participant[];
  participantCount: BN;
  blacklist: PublicKey[];
};

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

const SolanaRaffleApp = () => {
  const wallet = useWallet()
  console.log('hello', wallet)
  const [program, setProgram] = useState<Program<Idl> | null>(null)
  const [raffleAccounts, setRaffleAccounts] = useState<PublicKey[]>([])
  const [selectedRaffle, setSelectedRaffle] = useState<PublicKey | null>(null)
  const [raffleState, setRaffleState] = useState<RaffleState | null>(null)
  const [donationAmount, setDonationAmount] = useState(0.01)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  // Define fetchRaffleState first
  const fetchRaffleState = useCallback(async (raffleAccount: PublicKey, programInstance: Program<Idl> | null) => {
    if (!raffleAccount) return

    const prgInstance = programInstance || program
    if (!prgInstance) return

    try {
      setLoading(true)
      setStatusMessage('Loading raffle data...')

      const state = await prgInstance.account.raffleState.fetch(raffleAccount)
      setRaffleState(state as RaffleState)

      // Check if connected wallet is admin
      if (wallet.publicKey) {
        const isAdminWallet =
          state.admin.equals(wallet.publicKey) ||
          state.adminAuth1.equals(wallet.publicKey) ||
          state.adminAuth2.equals(wallet.publicKey) ||
          state.adminAuth3.equals(wallet.publicKey)

        setIsAdmin(isAdminWallet)
      }

      setStatusMessage('Raffle data loaded')
      setLoading(false)
    } catch (error: unknown) {
      console.error('Error fetching raffle state:', error)
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setLoading(false)
    }
  }, [program, wallet.publicKey])

  // Define fetchRaffleAccounts function
  const fetchRaffleAccounts = useCallback(async (programInstance: Program<Idl>) => {
    try {
      setLoading(true)
      setStatusMessage('Fetching raffle accounts...')

      const accounts = await programInstance.account.raffleState.all()
      setRaffleAccounts(accounts.map((acc) => acc.publicKey))

      if (accounts.length > 0 && !selectedRaffle) {
        setSelectedRaffle(accounts[0].publicKey)
        await fetchRaffleState(accounts[0].publicKey, programInstance)
      }

      setStatusMessage(`Found ${accounts.length} raffle account(s)`)
      setLoading(false)
    } catch (error: unknown) {
      console.error('Error fetching raffle accounts:', error)
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setLoading(false)
    }
  }, [selectedRaffle, fetchRaffleState])

  // Initialize Anchor program
  const initializeProgram = useCallback(() => {
    try {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
      const provider = new AnchorProvider(
        connection, 
        wallet as unknown as { 
          publicKey: PublicKey; 
          signTransaction: <T>(tx: T) => Promise<T>; 
          signAllTransactions: <T>(txs: T[]) => Promise<T[]>; 
        }, 
        { commitment: 'confirmed' }
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
    if (wallet && wallet.connected && wallet.publicKey) {
      console.log('Wallet connected:', wallet.publicKey.toString())
      initializeProgram()
    }
  }, [wallet, wallet.connected, wallet.publicKey, initializeProgram])

  // The functions are now defined above

  // Initialize a new raffle
  const initializeRaffle = async () => {
    if (!program || !wallet.publicKey) return

    try {
      setLoading(true)
      setStatusMessage('Creating new raffle...')

      // Generate a new keypair for the raffle state account
      const raffleKeypair = web3.Keypair.generate()

      // Call the initialize instruction
      const tx = await program.methods
        .initialize()
        .accounts({
          raffleState: raffleKeypair.publicKey,
          admin: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([raffleKeypair])
        .rpc({ commitment: 'confirmed' })

      setStatusMessage(`Raffle created! TX: ${tx.substring(0, 8)}...`)

      // Wait for blockchain to update
      setTimeout(async () => {
        if (program) {
          await fetchRaffleAccounts(program)
          setSelectedRaffle(raffleKeypair.publicKey)
        }
      }, 2000)

      setLoading(false)
    } catch (error: unknown) {
      console.error('Error initializing raffle:', error)
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setLoading(false)
    }
  }

  // Donate to raffle
  const donateToRaffle = async () => {
    if (!program || !wallet.publicKey || !selectedRaffle) return

    try {
      setLoading(true)
      setStatusMessage(`Donating ${donationAmount} SOL...`)

      const amountLamports = donationAmount * LAMPORTS_PER_SOL
      const [treasury] = findTreasuryPDA(programId)

      // Call the donate instruction
      const tx = await program.methods
        .donate(new BN(amountLamports))
        .accounts({
          raffleState: selectedRaffle,
          participant: wallet.publicKey,
          treasury: treasury,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: 'confirmed' })

      setStatusMessage(`Donated ${donationAmount} SOL! TX: ${tx.substring(0, 8)}...`)

      // Refresh the raffle state
      setTimeout(() => fetchRaffleState(selectedRaffle, null), 2000)

      setLoading(false)
    } catch (error: unknown) {
      console.error('Error donating:', error)
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setLoading(false)
    }
  }

  // Select a winner
  const selectWinner = async () => {
    if (!program || !wallet.publicKey || !selectedRaffle || !raffleState) return

    try {
      setLoading(true)
      setStatusMessage('Selecting winner...')

      const [treasury] = findTreasuryPDA(programId)
      const recentSlotHashPubkey = new PublicKey('SysvarS1otHashes111111111111111111111111111')

      // Use first participant or admin as winner account (actual winner is determined by the program)
      const winnerAccount = raffleState.participants && raffleState.participants.length > 0 
        ? raffleState.participants[0].wallet 
        : wallet.publicKey

      // Call the selectWinner instruction
      const tx = await program.methods
        .selectWinner()
        .accounts({
          raffleState: selectedRaffle,
          admin: wallet.publicKey,
          treasury: treasury,
          winnerAccount: winnerAccount,
          recentSlotHash: recentSlotHashPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: 'confirmed' })

      setStatusMessage(`Winner selected! TX: ${tx.substring(0, 8)}...`)

      // Refresh the raffle state
      setTimeout(() => fetchRaffleState(selectedRaffle, null), 2000)

      setLoading(false)
    } catch (error: unknown) {
      console.error('Error selecting winner:', error)
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setLoading(false)
    }
  }

  // Withdraw funds
  const withdrawFunds = async () => {
    if (!program || !wallet.publicKey || !selectedRaffle || !raffleState) return

    try {
      setLoading(true)
      setStatusMessage('Withdrawing funds...')

      const [treasury] = findTreasuryPDA(programId)
      const payoutWallet = raffleState.payoutWallet

      // Call the withdrawFunds instruction
      const tx = await program.methods
        .withdrawFunds()
        .accounts({
          raffleState: selectedRaffle,
          admin: wallet.publicKey,
          treasury: treasury,
          payoutWallet: payoutWallet,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: 'confirmed' })

      setStatusMessage(`Funds withdrawn! TX: ${tx.substring(0, 8)}...`)

      // Refresh the raffle state
      setTimeout(() => fetchRaffleState(selectedRaffle, null), 2000)

      setLoading(false)
    } catch (error: unknown) {
      console.error('Error withdrawing funds:', error)
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
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
  const handleRaffleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value
    if (selected) {
      setSelectedRaffle(new PublicKey(selected))
      fetchRaffleState(new PublicKey(selected), null)
    }
  }

  // Calculate progress percentage
  const getProgressPercentage = (totalSol: BN | null | undefined) => {
    if (!totalSol) return 0
    try {
      return Math.min(100, (totalSol.toNumber() / THRESHOLD_LAMPORTS) * 100)
    } catch {
      return 0
    }
  }

  return (
    <div className="bg-white shadow-md rounded-lg max-w-4xl mx-auto my-8 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-800">50/50 Solana Raffle</h1>
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded">
        <p>For every {THRESHOLD_SOL} SOL collected, 50% goes to a randomly selected participant.</p>
        <p className="text-sm mt-2">
          Connected to:{' '}
          {wallet.connected && wallet.publicKey
            ? `${wallet.publicKey.toString().substring(0, 6)}...${wallet.publicKey.toString().substring(wallet.publicKey.toString().length - 4)}`
            : 'Not connected'}
        </p>
      </div>

      {wallet.connected ? (
        <>
          {/* Admin Controls */}
          <div className="mb-6 p-4 bg-gray-100 rounded">
            <h2 className="text-lg font-semibold mb-2">Raffle Management</h2>

            {/* Create New Raffle */}
            <button
              onClick={initializeRaffle}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded mb-4 hover:bg-blue-600 disabled:bg-blue-300"
            >
              Create New Raffle
            </button>

            {/* Raffle Selection */}
            {raffleAccounts.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Select Raffle</label>
                <select
                  className="w-full p-2 border rounded"
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
            )}
          </div>

          {/* Raffle State Card */}
          {raffleState && selectedRaffle && (
            <div className="mb-6 border border-blue-200 rounded p-4">
              <h2 className="text-xl font-semibold mb-4">Raffle Status</h2>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span>Progress</span>
                  <span>
                    {formatSOL(raffleState?.totalSol)} / {THRESHOLD_SOL} SOL
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-600 rounded-full h-4"
                    style={{ width: `${getProgressPercentage(raffleState?.totalSol)}%` }}
                  ></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded">
                  <h3 className="text-sm font-medium">Pool Size</h3>
                  <p className="text-xl font-bold">{formatSOL(raffleState?.totalSol)} SOL</p>
                </div>

                <div className="bg-blue-50 p-3 rounded">
                  <h3 className="text-sm font-medium">Participants</h3>
                  <p className="text-xl font-bold">{raffleState?.participantCount?.toString() || "0"}</p>
                </div>

                <div className="bg-blue-50 p-3 rounded">
                  <h3 className="text-sm font-medium">Status</h3>
                  <p className="font-bold">
                    {raffleState?.winnerSelected ? (
                      <span className="text-green-600">Winner Selected</span>
                    ) : raffleState?.thresholdReached ? (
                      <span className="text-yellow-600">Ready for Drawing</span>
                    ) : (
                      <span className="text-blue-600">In Progress</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Winner Info */}
              {raffleState?.winnerSelected && (
                <div className="bg-green-50 p-3 rounded mb-4">
                  <h3 className="font-medium text-green-800">Winner</h3>
                  <p>
                    {raffleState.winner.toString().substring(0, 6)}...
                    {raffleState.winner.toString().substring(raffleState.winner.toString().length - 4)}
                  </p>
                  <p>
                    Prize: {formatSOL(raffleState.totalSol ? new BN(raffleState.totalSol.toNumber() / 2) : new BN(0))}{' '}
                    SOL
                  </p>
                </div>
              )}

              {/* Donation Form */}
              {!raffleState?.winnerSelected && (
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Donate to Enter</h3>
                  <div className="flex items-center">
                    <input
                      type="number"
                      className="p-2 border rounded-l w-full"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(parseFloat(e.target.value) || 0)}
                      min="0.01"
                      step="0.01"
                    />
                    <span className="bg-gray-100 p-2 border-t border-r border-b rounded-r">SOL</span>
                  </div>
                  <button
                    onClick={donateToRaffle}
                    disabled={loading || donationAmount <= 0}
                    className="mt-2 w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:bg-green-300"
                  >
                    Donate & Enter Raffle
                  </button>
                  <p className="text-sm mt-1">Each 0.01 SOL = 1 raffle ticket</p>
                </div>
              )}

              {/* Admin Actions */}
              {isAdmin && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-2">Admin Actions</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={selectWinner}
                      disabled={loading || raffleState?.winnerSelected || !raffleState?.thresholdReached}
                      className="bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600 disabled:bg-purple-300"
                    >
                      Select Winner
                    </button>

                    <button
                      onClick={withdrawFunds}
                      disabled={loading}
                      className="bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600 disabled:bg-yellow-300"
                    >
                      Withdraw Funds
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Messages */}
          {statusMessage && (
            <div
              className={`p-4 rounded mb-4 ${
                loading ? 'bg-blue-50' : statusMessage.toLowerCase().includes('error') ? 'bg-red-50' : 'bg-green-50'
              }`}
            >
              <p
                className={`${
                  loading
                    ? 'text-blue-700'
                    : statusMessage.toLowerCase().includes('error')
                      ? 'text-red-700'
                      : 'text-green-700'
                }`}
              >
                {statusMessage}
              </p>
            </div>
          )}
        </>
      ) : (
        // Wallet Not Connected Message
        <div className="p-6 bg-yellow-50 rounded">
          <h2 className="text-xl font-medium text-yellow-800 mb-2">Connect Your Wallet</h2>
          <p>Please connect your Solana wallet using the button in the top-right corner to interact with the raffle.</p>
          <p className="text-sm mt-2">Make sure your wallet is connected to Solana Devnet for testing.</p>
          <WalletMultiButton />
        </div>
      )}
    </div>
  )
}

const RaffleApp = () => {
  return (
    <WalletContextProvider>
      <SolanaRaffleApp />
    </WalletContextProvider>
  )
}

export default RaffleApp
