'use client'

import React, { useState, useEffect } from 'react'
import { Connection, PublicKey, clusterApiUrl, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Program, web3, BN, AnchorProvider } from '@project-serum/anchor'
import { useWallet, ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'

// Import styles but no wallet buttons
import '@solana/wallet-adapter-react-ui/styles.css'

// Import your IDL - adjust the path as needed
import idl from '../../../.watson/target/idl/solana_raffle.json'

const programId = new PublicKey('3pwsHuESbtUtQ9A9ChHp9y64VTJAEzuRQmxmrEiBLR4d')

// Function to find the treasury PDA
const findTreasuryPDA = (programId: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId)
}

// The threshold in SOL - half will be distributed when this is reached
// Set to a small amount for testing purposes (1 SOL) - in production this would be higher
const THRESHOLD_SOL = 1
const THRESHOLD_LAMPORTS = THRESHOLD_SOL * LAMPORTS_PER_SOL

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

const WalletContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet
  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]

  const endpoint = clusterApiUrl(network)

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}

const RaffleContent: React.FC = () => {
  const wallet = useWallet()
  const [program, setProgram] = useState<Program | null>(null)
  const [raffleAccount, setRaffleAccount] = useState<PublicKey | null>(null)
  const [raffleState, setRaffleState] = useState<RaffleState | null>(null)
  const [donationAmount, setDonationAmount] = useState<number>(0.01)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [raffleAccounts, setRaffleAccounts] = useState<PublicKey[]>([])
  const [selectedRaffle, setSelectedRaffle] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showParticipantsList, setShowParticipantsList] = useState(false)
  const [donationConfirmed, setDonationConfirmed] = useState(false)

  useEffect(() => {
    if (wallet && wallet.publicKey) {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
      const provider = new AnchorProvider(connection, wallet as any, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      })

      // Create the program interface
      const program = new Program(idl as any, programId, provider)
      setProgram(program)

      // Try to fetch existing raffle accounts when wallet connects
      fetchRaffleAccounts(program)
    }
  }, [wallet.publicKey])

  useEffect(() => {
    if (program && raffleAccount) {
      fetchRaffleState()
    }
  }, [program, raffleAccount])

  useEffect(() => {
    if (wallet.publicKey && raffleState) {
      // Check if the connected wallet is an admin
      const isAdminWallet =
        raffleState.admin.equals(wallet.publicKey) ||
        raffleState.adminAuth1.equals(wallet.publicKey) ||
        raffleState.adminAuth2.equals(wallet.publicKey) ||
        raffleState.adminAuth3.equals(wallet.publicKey)

      setIsAdmin(isAdminWallet)
    } else {
      setIsAdmin(false)
    }
  }, [wallet.publicKey, raffleState])

  const fetchRaffleAccounts = async (program: Program) => {
    try {
      setLoading(true)
      setStatusMessage('Fetching raffle accounts...')

      // Get all program accounts of type RaffleState
      const accounts = await program.account.raffleState.all()
      setRaffleAccounts(accounts.map((acc) => acc.publicKey))

      // If there are accounts and no selected one, select the first one
      if (accounts.length > 0 && !raffleAccount) {
        setRaffleAccount(accounts[0].publicKey)
        setSelectedRaffle(accounts[0].publicKey.toString())
      }

      setStatusMessage(`Found ${accounts.length} raffle account(s)`)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching raffle accounts:', error)
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setLoading(false)
    }
  }

  const fetchRaffleState = async () => {
    if (!program || !raffleAccount) return

    try {
      setLoading(true)
      setStatusMessage('Fetching raffle state...')

      const state = await program.account.raffleState.fetch(raffleAccount)
      setRaffleState(state as unknown as RaffleState)

      setStatusMessage('Raffle state fetched successfully')
      setLoading(false)
    } catch (error) {
      console.error('Error fetching raffle state:', error)
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setLoading(false)
    }
  }

  const confirmDonation = () => {
    // Check if the user has sufficient SOL balance
    if (donationAmount <= 0) {
      setStatusMessage('Error: Donation amount must be greater than 0')
      return
    }

    setDonationConfirmed(true)
  }

  const cancelDonation = () => {
    setDonationConfirmed(false)
  }

  const donateToRaffle = async () => {
    if (!program || !wallet.publicKey || !raffleAccount) return

    try {
      setLoading(true)
      setStatusMessage(`Processing donation of ${donationAmount} SOL...`)
      setDonationConfirmed(false)

      // Calculate the donation amount in lamports
      const amountLamports = donationAmount * LAMPORTS_PER_SOL

      // Find the treasury PDA
      const [treasury, treasuryBump] = findTreasuryPDA(programId)

      console.log('Donating to raffle:', {
        raffleState: raffleAccount.toString(),
        participant: wallet.publicKey.toString(),
        treasury: treasury.toString(),
        amount: amountLamports.toString()
      });

      // Call the donate instruction
      const tx = await program.methods
        .donate(new BN(amountLamports))
        .accounts({
          raffleState: raffleAccount,
          participant: wallet.publicKey,
          treasury: treasury,
          systemProgram: SystemProgram.programId,
        })
        .rpc({
          commitment: 'confirmed'  // Ensure the transaction is confirmed
        })

      // Success message with transaction signature
      setStatusMessage(`Successfully donated ${donationAmount} SOL! Transaction: ${tx.substring(0, 8)}...`)
      setLoading(false)

      // Calculate new tickets gained (each 0.01 SOL = 1 ticket)
      const ticketsGained = Math.floor(donationAmount * 100)

      setTimeout(() => {
        // Update status message after a few seconds to show tickets gained
        setStatusMessage(`You've received ${ticketsGained} raffle tickets. Good luck!`)

        // Refresh the raffle state
        fetchRaffleState()
      }, 2000)
    } catch (error) {
      console.error('Error donating to raffle:', error)

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          setStatusMessage(`Error: Insufficient funds in your wallet for this donation`)
        } else if (error.message.includes('blacklisted') || error.message.includes('BlacklistedParticipant')) {
          setStatusMessage(`Error: Your wallet is blacklisted from this raffle`)
        } else if (error.message.includes('custom program error: 0x0')) {
          setStatusMessage(`Error: Transaction failed - try with a smaller donation amount`)
        } else {
          setStatusMessage(`Error: ${error.message}`)
        }
      } else {
        setStatusMessage(`Error: ${String(error)}`)
      }

      setLoading(false)
    }
  }

  const selectWinner = async () => {
    if (!program || !wallet.publicKey || !raffleAccount || !raffleState) return

    try {
      setLoading(true)
      setStatusMessage('Selecting winner...')

      // Find the treasury PDA
      const [treasury, treasuryBump] = findTreasuryPDA(programId)

      // Get the slot hashes sysvar account
      const recentSlotHashPubkey = new PublicKey('SysvarS1otHashes111111111111111111111111111')
      
      // Since the winner account is determined by the program, we can use any account
      // In this case, we're using a default program-derived winner account to comply with the IDL
      // The actual winner will be determined by the program logic
      const winnerAccount = raffleState.participants.length > 0 
        ? raffleState.participants[0].wallet 
        : wallet.publicKey;

      // Call the selectWinner instruction
      const tx = await program.methods
        .selectWinner()
        .accounts({
          raffleState: raffleAccount,
          admin: wallet.publicKey,
          treasury: treasury,
          winnerAccount: winnerAccount,
          recentSlotHash: recentSlotHashPubkey,
          systemProgram: SystemProgram.programId,
        })
        .signers([]) // No additional signers needed
        .rpc({ commitment: 'confirmed' }) // Ensure the transaction is confirmed

      setStatusMessage(`Winner selected successfully! Transaction: ${tx.substring(0, 8)}...`)
      setLoading(false)

      // Refresh the raffle state with a small delay to ensure blockchain state is updated
      setTimeout(() => {
        fetchRaffleState()
      }, 2000)
    } catch (error) {
      console.error('Error selecting winner:', error)
      
      // Provide more specific error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('Threshold not reached')) {
          setStatusMessage(`Error: The threshold of ${THRESHOLD_SOL} SOL has not been reached yet.`)
        } else if (error.message.includes('Winner already selected')) {
          setStatusMessage(`Error: A winner has already been selected for this raffle.`)
        } else if (error.message.includes('Unauthorized')) {
          setStatusMessage(`Error: Only the admin wallet (${raffleState.admin.toString().substring(0, 8)}...) can select a winner.`)
        } else {
          setStatusMessage(`Error: ${error.message}`)
        }
      } else {
        setStatusMessage(`Error: ${String(error)}`)
      }
      
      setLoading(false)
    }
  }

  const withdrawFunds = async () => {
    if (!program || !wallet.publicKey || !raffleAccount || !raffleState) return

    try {
      setLoading(true)
      setStatusMessage('Withdrawing funds...')

      // Find the treasury PDA
      const [treasury, treasuryBump] = findTreasuryPDA(programId)

      // Get the payout wallet from the raffle state
      // Fixed payout wallet from the program
      const payoutWallet = raffleState.payoutWallet;

      // Log info for debugging
      console.log({
        raffleStateAddress: raffleAccount.toString(),
        adminWallet: wallet.publicKey.toString(),
        treasuryPDA: treasury.toString(),
        payoutWallet: payoutWallet.toString(),
        isAdmin: raffleState.admin.equals(wallet.publicKey),
        isAdminAuth1: raffleState.adminAuth1.equals(wallet.publicKey),
        isAdminAuth2: raffleState.adminAuth2.equals(wallet.publicKey),
        isAdminAuth3: raffleState.adminAuth3.equals(wallet.publicKey),
      });

      // Call the withdrawFunds instruction
      const tx = await program.methods
        .withdrawFunds()
        .accounts({
          raffleState: raffleAccount,
          admin: wallet.publicKey,
          treasury: treasury,
          payoutWallet: payoutWallet,
          systemProgram: SystemProgram.programId,
        })
        .signers([]) // No additional signers required
        .rpc({ 
          commitment: 'confirmed',    // Ensure the transaction is confirmed
          skipPreflight: true         // Skip preflight checks to debug any issues
        })

      setStatusMessage(`Funds withdrawn successfully! Transaction: ${tx.substring(0, 8)}...`)
      setLoading(false)

      // Refresh the raffle state with a small delay to ensure blockchain state is updated
      setTimeout(() => {
        fetchRaffleState()
      }, 2000)
    } catch (error) {
      console.error('Error withdrawing funds:', error)
      
      // Provide more specific error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          setStatusMessage(`Error: You're not authorized to withdraw funds. Only admin or authorized wallets can withdraw.`)
        } else if (error.message.includes('custom program error: 0x0')) {
          setStatusMessage(`Error: This transaction would leave the treasury account with insufficient SOL.`)
        } else {
          setStatusMessage(`Error: ${error.message}`)
        }
      } else {
        setStatusMessage(`Error: ${String(error)}`)
      }
      
      setLoading(false)
    }
  }

  const initializeRaffle = async () => {
    if (!program || !wallet.publicKey) return

    try {
      setLoading(true)
      setStatusMessage('Initializing new raffle...')

      // Generate a new keypair for the raffle state account
      const raffleKeypair = web3.Keypair.generate()
      
      console.log('Initializing raffle with state account:', raffleKeypair.publicKey.toString());
      
      // Call the initialize instruction
      const tx = await program.methods
        .initialize()
        .accounts({
          raffleState: raffleKeypair.publicKey,
          admin: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([raffleKeypair]) // Include the raffle keypair as a signer 
        .rpc({ 
          commitment: 'confirmed',
          skipPreflight: false
        })

      setStatusMessage(`Raffle initialized successfully! Transaction: ${tx.substring(0, 8)}...`)
      setLoading(false)

      // After successfully initializing, wait a moment for blockchain to update
      setTimeout(async () => {
        // Fetch the updated list of raffle accounts
        await fetchRaffleAccounts(program)
        
        // Set the newly created raffle as the selected one
        setRaffleAccount(raffleKeypair.publicKey)
        setSelectedRaffle(raffleKeypair.publicKey.toString())
      }, 2000);
      
    } catch (error) {
      console.error('Error initializing raffle:', error)
      
      if (error instanceof Error) {
        // More specific error messages for initialization errors
        if (error.message.includes('insufficient funds')) {
          setStatusMessage('Error: Not enough SOL in your wallet to initialize a raffle.')
        } else if (error.message.includes('already in use')) {
          setStatusMessage('Error: This raffle account already exists.')
        } else {
          setStatusMessage(`Error: ${error.message}`)
        }
      } else {
        setStatusMessage(`Error: ${String(error)}`)
      }
      
      setLoading(false)
    }
  }

  const handleRaffleSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value
    if (selected) {
      setSelectedRaffle(selected)
      setRaffleAccount(new PublicKey(selected))
    }
  }

  const formatSOL = (lamports: BN | null) => {
    if (!lamports) return '0'
    try {
      return (lamports.toNumber() / LAMPORTS_PER_SOL).toFixed(4)
    } catch (e) {
      return 'Amount too large'
    }
  }

  const progressToThreshold = (totalSol: BN | null) => {
    if (!totalSol) return 0
    try {
      return Math.min(100, (totalSol.toNumber() / THRESHOLD_LAMPORTS) * 100)
    } catch (e) {
      return 100 // If the number is too large, assume we've hit the threshold
    }
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-blue-800">50/50 Solana Raffle</h1>
        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded border border-green-200">
          v1.0
        </span>
      </div>
      <p className="mb-4 text-gray-600">
        For every {THRESHOLD_SOL} SOL collected, half will be distributed to a random participant. Your chance of
        winning increases with the amount you donate.
      </p>
      <div className="flex items-center mb-6 text-sm text-gray-500 space-x-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-blue-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          Program ID: {programId.toString().substring(0, 4)}...
          {programId.toString().substring(programId.toString().length - 4)}
        </span>
      </div>

      {wallet.publicKey ? (
        <>
          {/* Admin Initialization Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded">
            <h2 className="text-xl font-semibold mb-2">Raffle Management</h2>

            {/* Initialize Raffle Button */}
            <div className="mb-4">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
                onClick={initializeRaffle}
                disabled={loading}
              >
                Initialize New Raffle
              </button>
              <span className="text-sm text-gray-600">Create a new raffle as an admin.</span>
            </div>

            {/* Raffle Account Selection */}
            {raffleAccounts.length > 0 ? (
              <div>
                <h3 className="font-medium mb-2">Select Existing Raffle</h3>
                <div className="mb-4">
                  <select className="w-full p-2 border rounded" value={selectedRaffle} onChange={handleRaffleSelection}>
                    <option value="">-- Select a raffle --</option>
                    {raffleAccounts.map((acc, idx) => (
                      <option key={idx} value={acc.toString()}>
                        Raffle #{idx + 1}: {acc.toString().substring(0, 8)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="mb-4 bg-yellow-100 p-3 rounded">
                No raffle accounts found. Initialize a new raffle using the button above.
              </p>
            )}
          </div>

          {/* Raffle State Info */}
          {raffleState && (
            <div className="mb-6 p-6 bg-blue-50 rounded border border-blue-100">
              <h2 className="text-2xl font-semibold mb-4 text-blue-800">Raffle Status</h2>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-blue-700">Progress to Winner Selection</span>
                  <span className="text-sm font-medium text-blue-700">
                    {formatSOL(raffleState.totalSol)} / {THRESHOLD_SOL} SOL
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-blue-600 h-6 rounded-full transition-all duration-500 ease-in-out flex items-center justify-center text-white text-xs"
                    style={{ width: `${progressToThreshold(raffleState.totalSol)}%` }}
                  >
                    {Math.floor(progressToThreshold(raffleState.totalSol))}%
                  </div>
                </div>
              </div>

              {/* Raffle statistics cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="text-lg font-medium mb-2 text-blue-800">Pool Size</h3>
                  <p className="text-3xl font-bold text-blue-600">{formatSOL(raffleState.totalSol)} SOL</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Potential prize:{' '}
                    {formatSOL(raffleState.totalSol ? new BN(raffleState.totalSol.toNumber() / 2) : new BN(0))} SOL
                  </p>
                </div>

                <div className="bg-white p-4 rounded shadow">
                  <h3 className="text-lg font-medium mb-2 text-blue-800">Participants</h3>
                  <p className="text-3xl font-bold text-blue-600">{raffleState.participantCount.toString()}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Total tickets: {raffleState.participants.reduce((acc, p) => acc + parseInt(p.tokens.toString()), 0)}
                  </p>
                </div>

                <div className="bg-white p-4 rounded shadow">
                  <h3 className="text-lg font-medium mb-2 text-blue-800">Status</h3>
                  {raffleState.winnerSelected ? (
                    <p className="text-xl font-bold text-green-600">Winner Selected</p>
                  ) : raffleState.thresholdReached ? (
                    <p className="text-xl font-bold text-yellow-600">Ready for Drawing</p>
                  ) : (
                    <p className="text-xl font-bold text-blue-600">In Progress</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {raffleState.winnerSelected
                      ? `Winner: ${raffleState.winner.toString().substring(0, 8)}...`
                      : raffleState.thresholdReached
                        ? 'Admin can select winner now'
                        : `${THRESHOLD_SOL - parseFloat(formatSOL(raffleState.totalSol))} SOL needed`}
                  </p>
                </div>
              </div>

              {/* Your statistics */}
              {wallet.publicKey && (
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="text-lg font-medium mb-2 text-blue-800">Your Participation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Your Tickets</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {raffleState.participants
                          .find((p) => wallet.publicKey && p.wallet.equals(wallet.publicKey))
                          ?.tokens.toString() || '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Win Chance</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {raffleState && raffleState.participantCount.toNumber() > 0
                          ? (
                              (parseInt(
                                raffleState.participants
                                  .find((p) => wallet.publicKey && p.wallet.equals(wallet.publicKey))
                                  ?.tokens.toString() || '0',
                              ) /
                                raffleState.participants.reduce((acc, p) => acc + parseInt(p.tokens.toString()), 0)) *
                              100
                            ).toFixed(2)
                          : '0'}
                        %
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Potential Prize</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatSOL(raffleState.totalSol ? new BN(raffleState.totalSol.toNumber() / 2) : new BN(0))} SOL
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Donation Form */}
          {raffleAccount && (
            <div className="mb-6 p-6 bg-green-50 rounded border border-green-100">
              <h2 className="text-2xl font-semibold mb-4 text-green-800">Donate to Win 50% of the Pool</h2>

              {donationConfirmed ? (
                // Donation Confirmation Dialog
                <div className="mb-4 bg-white p-6 rounded shadow-md border border-yellow-200">
                  <h3 className="text-xl font-semibold mb-3 text-yellow-800">Confirm Your Donation</h3>
                  <div className="bg-yellow-50 p-4 rounded mb-4">
                    <p className="mb-2">
                      <strong>Amount:</strong> {donationAmount} SOL
                    </p>
                    <p className="mb-2">
                      <strong>Tickets to Receive:</strong> {Math.floor(donationAmount * 100)}
                    </p>
                    <p className="mb-2">
                      <strong>Current Pool Size:</strong> {raffleState ? formatSOL(raffleState.totalSol) : '0'} SOL
                    </p>
                    <p className="mb-4">
                      <strong>Potential Prize (if you win):</strong>{' '}
                      {raffleState
                        ? formatSOL(
                            new BN(raffleState.totalSol.toNumber() + donationAmount * LAMPORTS_PER_SOL).div(new BN(2)),
                          )
                        : (donationAmount / 2).toFixed(4)}{' '}
                      SOL
                    </p>
                    <div className="text-sm text-gray-600 mb-2">
                      <p>• This will transfer {donationAmount} SOL from your wallet</p>
                      <p>• Transactions on Solana are irreversible</p>
                      <p>• Network fees will apply</p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={cancelDonation}
                      className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={donateToRaffle}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Confirm Donation'}
                    </button>
                  </div>
                </div>
              ) : (
                // Donation Input Form
                <div className="mb-4 bg-white p-4 rounded shadow">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Donation Amount (SOL)</label>
                      <div className="flex items-center">
                        <input
                          type="number"
                          className="w-full p-3 border rounded-l-md focus:ring-green-500 focus:border-green-500"
                          value={donationAmount}
                          onChange={(e) => setDonationAmount(parseFloat(e.target.value) || 0)}
                          min="0.01"
                          step="0.01"
                        />
                        <span className="bg-gray-100 p-3 border border-l-0 rounded-r-md">SOL</span>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <div className="w-full">
                        <p className="mb-2 text-sm text-gray-600">
                          You'll receive <strong>{Math.floor(donationAmount * 100)}</strong> tickets
                        </p>
                        <button
                          className="w-full bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 transition-colors"
                          onClick={confirmDonation}
                          disabled={loading || !raffleAccount || donationAmount <= 0}
                        >
                          {loading ? 'Processing...' : 'Donate & Enter Raffle'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white p-4 rounded shadow">
                <h3 className="font-medium mb-2 text-green-800">How It Works</h3>
                <ul className="list-disc pl-5 mb-4 text-sm text-gray-600 space-y-1">
                  <li>Every 0.01 SOL donation gives you 1 ticket in the raffle</li>
                  <li>When the pool reaches {THRESHOLD_SOL} SOL, 50% (half) will be awarded to a random winner</li>
                  <li>Your chance of winning is proportional to how many tickets you have</li>
                  <li>The more you donate, the higher your chances of winning!</li>
                </ul>

                {raffleState && raffleState.participants && raffleState.participants.length > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-green-800">Your Current Entries</h3>
                      <button
                        onClick={() => setShowParticipantsList(!showParticipantsList)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {showParticipantsList ? 'Hide All Participants' : 'Show All Participants'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      You have{' '}
                      <strong>
                        {raffleState.participants
                          .find((p) => wallet.publicKey && p.wallet.equals(wallet.publicKey))
                          ?.tokens.toString() || '0'}
                      </strong>{' '}
                      tickets (
                      {raffleState && raffleState.participantCount.toNumber() > 0
                        ? (
                            (parseInt(
                              raffleState.participants
                                .find((p) => wallet.publicKey && p.wallet.equals(wallet.publicKey))
                                ?.tokens.toString() || '0',
                            ) /
                              raffleState.participants.reduce((acc, p) => acc + parseInt(p.tokens.toString()), 0)) *
                            100
                          ).toFixed(2)
                        : '0'}
                      % chance of winning)
                    </p>

                    {/* Participants List */}
                    {showParticipantsList && (
                      <div className="mt-3 border rounded overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Wallet
                              </th>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Tickets
                              </th>
                              <th
                                scope="col"
                                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                Win Chance
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {raffleState.participants
                              .sort((a, b) => parseInt(b.tokens.toString()) - parseInt(a.tokens.toString()))
                              .map((participant, idx) => {
                                const totalTickets = raffleState.participants.reduce(
                                  (acc, p) => acc + parseInt(p.tokens.toString()),
                                  0,
                                )
                                const winChance = (
                                  (parseInt(participant.tokens.toString()) / totalTickets) *
                                  100
                                ).toFixed(2)
                                const isYou = wallet.publicKey && participant.wallet.equals(wallet.publicKey)

                                return (
                                  <tr key={idx} className={isYou ? 'bg-green-50' : ''}>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                                      <span className={isYou ? 'font-semibold text-green-700' : ''}>
                                        {participant.wallet.toString().substring(0, 4)}...
                                        {participant.wallet
                                          .toString()
                                          .substring(participant.wallet.toString().length - 4)}
                                        {isYou ? ' (You)' : ''}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                                      {participant.tokens.toString()}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm">{winChance}%</td>
                                  </tr>
                                )
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin Actions */}
          {raffleState && wallet.publicKey && isAdmin && (
            <div className="mb-6 p-4 bg-purple-50 rounded border border-purple-200">
              <h2 className="text-xl font-semibold mb-2 text-purple-800">Admin Control Panel</h2>
              
              <div className="bg-white p-4 rounded shadow mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1"><strong className="text-purple-700">Admin:</strong> {raffleState.admin.toString().substring(0, 8)}...</p>
                    <p className="mb-1"><strong className="text-purple-700">Treasury:</strong> {raffleState.treasury.toString().substring(0, 8)}...</p>
                    <p className="mb-1"><strong className="text-purple-700">Payout Wallet:</strong> {raffleState.payoutWallet.toString().substring(0, 8)}...</p>
                  </div>
                  <div>
                    <p className="mb-1">
                      <strong className="text-purple-700">Your Role:</strong> 
                      <span className="ml-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        {raffleState.admin.equals(wallet.publicKey) ? 'Primary Admin' : 'Admin Authority'}
                      </span>
                    </p>
                    <p className="mb-1">
                      <strong className="text-purple-700">Can Select Winner:</strong> 
                      <span className={`ml-1 px-2 py-0.5 rounded text-xs font-medium ${
                        !raffleState.winnerSelected && raffleState.thresholdReached && raffleState.admin.equals(wallet.publicKey) 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {!raffleState.winnerSelected && raffleState.thresholdReached && raffleState.admin.equals(wallet.publicKey) ? 'Yes' : 'No'}
                      </span>
                    </p>
                    <p className="mb-1">
                      <strong className="text-purple-700">Can Withdraw:</strong> 
                      <span className="ml-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Yes</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded shadow mb-4">
                <h3 className="font-medium text-purple-800 mb-3">Admin Actions</h3>
                <div className="flex flex-wrap gap-4">
                  <button
                    className={`px-4 py-2 rounded text-white ${
                      !raffleState.winnerSelected && raffleState.thresholdReached && raffleState.admin.equals(wallet.publicKey)
                        ? 'bg-purple-500 hover:bg-purple-600'
                        : 'bg-purple-300 cursor-not-allowed'
                    }`}
                    onClick={selectWinner}
                    disabled={loading || raffleState.winnerSelected || !raffleState.thresholdReached || !raffleState.admin.equals(wallet.publicKey)}
                    title={
                      raffleState.winnerSelected
                        ? 'Winner has already been selected'
                        : !raffleState.thresholdReached
                        ? 'Threshold not reached'
                        : !raffleState.admin.equals(wallet.publicKey)
                        ? 'Only primary admin can select winner'
                        : 'Select a winner for this raffle'
                    }
                  >
                    Select Winner
                  </button>
                  <button
                    className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                    onClick={withdrawFunds}
                    disabled={loading}
                    title="Withdraw funds to the designated payout wallet"
                  >
                    Withdraw Funds
                  </button>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Selecting a winner requires the threshold of {THRESHOLD_SOL} SOL to be reached.</li>
                    <li>Only the primary admin wallet can select a winner. Admin authorities can only withdraw funds.</li>
                    <li>Withdrawing funds will transfer the treasury balance to {raffleState.payoutWallet.toString().substring(0, 4)}...{raffleState.payoutWallet.toString().substring(raffleState.payoutWallet.toString().length - 4)}</li>
                  </ul>
                </div>
              </div>

              {!raffleState.thresholdReached && (
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <h3 className="font-medium text-blue-800 mb-1">Threshold Not Reached</h3>
                  <p className="text-sm text-blue-700">
                    Currently at {formatSOL(raffleState.totalSol)} SOL. Need {THRESHOLD_SOL} SOL to select a winner.
                    <br />
                    Share the raffle link with potential participants to reach the threshold.
                  </p>
                  <div className="mt-2 w-full bg-blue-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${progressToThreshold(raffleState.totalSol)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {raffleState.winnerSelected && (
                <div className="bg-green-50 p-4 rounded border border-green-200">
                  <h3 className="font-medium text-green-800 mb-1">Winner Selected</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-green-700 mb-1">
                        <strong>Winner:</strong> {raffleState.winner.toString().substring(0, 8)}...
                      </p>
                      <p className="text-sm text-green-700 mb-1">
                        <strong>Prize Amount:</strong> {formatSOL(raffleState.totalSol ? new BN(raffleState.totalSol.toNumber() / 2) : new BN(0))} SOL
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-green-700">
                        50% of the funds have been automatically transferred to the winner. The remaining 50% can be withdrawn to the designated payout wallet.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Messages */}
          {statusMessage && (
            <div
              className={`p-4 rounded-md border shadow-sm ${
                loading
                  ? 'bg-blue-50 border-blue-200'
                  : statusMessage.toLowerCase().includes('error')
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-center">
                {loading ? (
                  <svg
                    className="animate-spin h-5 w-5 mr-3 text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : statusMessage.toLowerCase().includes('error') ? (
                  <svg
                    className="h-5 w-5 mr-3 text-red-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 mr-3 text-green-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <p
                  className={`font-medium ${loading ? 'text-blue-700' : statusMessage.toLowerCase().includes('error') ? 'text-red-700' : 'text-green-700'}`}
                >
                  {statusMessage}
                </p>
              </div>

              {loading && (
                <p className="text-sm text-blue-500 mt-2 ml-8">
                  This may take a moment. Please keep your wallet connected.
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-100 mb-6">
          <h3 className="text-xl font-medium text-yellow-800 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-700 mb-3">
            Please connect your Solana wallet using the wallet button in the navbar to interact with the raffle.
          </p>
          <p className="text-sm text-gray-600">
            Make sure your wallet is connected to the Solana Devnet for testing.
          </p>
        </div>
      )}
    </div>
  )
}

const TestInstructions: React.FC = () => {
  const [showInstructions, setShowInstructions] = useState(true)

  if (!showInstructions) return null

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-blue-800">Test Instructions</h2>
        <button onClick={() => setShowInstructions(false)} className="text-sm text-gray-500 hover:text-gray-700">
          Hide
        </button>
      </div>
      <div className="text-sm text-gray-700">
        <p className="mb-2">This is a test environment for the Solana raffle contract. Follow these steps to test:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Connect your Phantom or Solflare wallet using the wallet button in the navbar</li>
          <li>Create a new raffle by clicking the "Initialize New Raffle" button</li>
          <li>Enter a donation amount (0.01 SOL minimum) and click "Donate & Enter Raffle"</li>
          <li>For testing purposes, the threshold to select a winner is set to {THRESHOLD_SOL} SOL</li>
          <li>If you're the admin, you can select a winner once the threshold is reached</li>
        </ol>
        <div className="mt-3 p-2 bg-yellow-100 rounded">
          <p>
            <strong>Note:</strong> This is running on Solana Devnet. Make sure your wallet is on Devnet and has SOL.
          </p>
          <p>
            Get Devnet SOL from{' '}
            <a
              href="https://solfaucet.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Solana Faucet
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

const RaffleApp: React.FC = () => {
  return (
    <WalletContextProvider>
      <div className="container mx-auto p-6">
        <TestInstructions />
        <RaffleContent />
      </div>
    </WalletContextProvider>
  )
}

export default RaffleApp
