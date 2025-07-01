'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Connection, PublicKey, clusterApiUrl, SystemProgram, LAMPORTS_PER_SOL, SYSVAR_SLOT_HASHES_PUBKEY } from '@solana/web3.js'
import { Program, BN, AnchorProvider, web3, Idl } from '@project-serum/anchor'
import { useWallet, ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import dynamic from 'next/dynamic'

import '@solana/wallet-adapter-react-ui/styles.css'

// Dynamic wallet button to prevent hydration issues
const WalletMultiButtonDynamic = dynamic(
  async () => {
    return WalletMultiButton
  },
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

type RaffleAccount = {
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

const programId = new PublicKey('DsZZh8M2JMYSMPvvM1ZQdYZhgab9zJvcdY8RTLAEeB5e')

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
  const [raffles, setRaffles] = useState<RaffleAccount[]>([])
  const [selectedRaffle, setSelectedRaffle] = useState<string | null>(null)
  const [donationAmount, setDonationAmount] = useState('0.1')
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const getProgram = useCallback(() => {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      throw new Error('Wallet not fully initialized')
    }
    const walletAdapter = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
      payer: wallet.publicKey
    }
    const provider = new AnchorProvider(connection, walletAdapter, { preflightCommitment: 'confirmed' })
    return new Program(idl as Idl, programId, provider)
  }, [wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions])

  const checkIfAdmin = useCallback((raffle: RaffleState) => {
    if (!wallet.publicKey) return false
    const walletKey = wallet.publicKey.toString()
    return (
      raffle.admin.toString() === walletKey ||
      raffle.adminAuth1.toString() === walletKey ||
      raffle.adminAuth2.toString() === walletKey ||
      raffle.adminAuth3.toString() === walletKey
    )
  }, [wallet.publicKey])

  const calculateWinningProbability = (raffle: RaffleState, participantWallet: PublicKey) => {
    const participant = raffle.participants.find(p => p.wallet.toString() === participantWallet.toString())
    if (!participant) return '0%'
    
    const totalTickets = raffle.participants.reduce((sum, p) => sum + p.tokens.toNumber(), 0)
    if (totalTickets === 0) return '0%'
    
    const probability = (participant.tokens.toNumber() / totalTickets) * 100
    return `${probability.toFixed(2)}%`
  }

  const fetchRaffleState = useCallback(async () => {
    if (!wallet.connected) return

    try {
      setLoading(true)
      const program = getProgram()
      
      console.log('Fetching raffle state accounts...')
      const accounts = await program.account.raffleState.all()
      console.log('Found accounts:', accounts.length)
      
      const raffleAccounts = accounts.map(acc => ({
        publicKey: acc.publicKey,
        account: acc.account as unknown as RaffleState
      }))
      
      setRaffles(raffleAccounts)
      
      if (raffleAccounts.length > 0 && !selectedRaffle) {
        const firstRaffle = raffleAccounts[0].publicKey.toString()
        setSelectedRaffle(firstRaffle)
        setIsAdmin(checkIfAdmin(raffleAccounts[0].account))
      }
    } catch (error: unknown) {
      console.error('Error fetching raffle state:', error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }, [wallet.connected, getProgram, checkIfAdmin, selectedRaffle])

  useEffect(() => {
    if (wallet.connected) {
      fetchRaffleState()
    }
  }, [wallet.connected, fetchRaffleState])

  const handleCreateRaffle = async () => {
    if (!wallet.connected || !wallet.publicKey) return

    try {
      setLoading(true)
      const program = getProgram()
      const raffleStateAccount = web3.Keypair.generate()

      const tx = await program.methods
        .initialize()
        .accounts({
          raffleState: raffleStateAccount.publicKey,
          admin: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([raffleStateAccount])
        .rpc()

      console.log('Raffle created:', tx)
      await fetchRaffleState()
    } catch (error: unknown) {
      console.error('Error creating raffle:', error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  const handleSelectWinner = async () => {
    if (!wallet.connected || !wallet.publicKey || !selectedRaffle) return

    try {
      setLoading(true)
      const program = getProgram()
      const [treasuryPDA] = findTreasuryPDA(programId)
      const raffleStateAddress = new PublicKey(selectedRaffle)
      const selectedRaffleState = raffles.find(r => r.publicKey.toString() === selectedRaffle)

      if (!selectedRaffleState) {
        throw new Error('Selected raffle not found')
      }

      if (!selectedRaffleState.account.thresholdReached) {
        throw new Error('Threshold not reached yet')
      }

      if (selectedRaffleState.account.winnerSelected) {
        throw new Error('Winner already selected')
      }

      // Get the participant with the most tokens as a fallback if random selection fails
      const participantWithMostTokens = selectedRaffleState.account.participants.reduce((prev, current) => {
        return (prev.tokens.toNumber() > current.tokens.toNumber()) ? prev : current
      }, selectedRaffleState.account.participants[0])

      const tx = await program.methods
        .selectWinner()
        .accounts({
          raffleState: raffleStateAddress,
          admin: wallet.publicKey,
          treasury: treasuryPDA,
          winnerAccount: participantWithMostTokens.wallet,
          recentSlotHash: SYSVAR_SLOT_HASHES_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Winner selected:', tx)
      await fetchRaffleState()
    } catch (error: unknown) {
      console.error('Error selecting winner:', error instanceof Error ? error.message : String(error))
      alert(error instanceof Error ? error.message : 'Failed to select winner')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!wallet.connected || !wallet.publicKey || !selectedRaffle) return

    try {
      setLoading(true)
      const program = getProgram()
      const [treasuryPDA] = findTreasuryPDA(programId)
      const raffleStateAddress = new PublicKey(selectedRaffle)
      const selectedRaffleState = raffles.find(r => r.publicKey.toString() === selectedRaffle)

      if (!selectedRaffleState) return

      const tx = await program.methods
        .withdrawFunds()
        .accounts({
          raffleState: raffleStateAddress,
          admin: wallet.publicKey,
          treasury: treasuryPDA,
          payoutWallet: selectedRaffleState.account.payoutWallet,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Withdrawal complete:', tx)
      await fetchRaffleState()
    } catch (error) {
      console.error('Error withdrawing funds:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDonate = async () => {
    if (!wallet.connected || !wallet.publicKey || !selectedRaffle) return

    try {
      setLoading(true)
      const program = getProgram()
      const [treasuryPDA] = findTreasuryPDA(programId)
      const raffleStateAddress = new PublicKey(selectedRaffle)
      const lamports = parseFloat(donationAmount) * LAMPORTS_PER_SOL

      const tx = await program.methods
        .donate(new BN(lamports))
        .accounts({
          raffleState: raffleStateAddress,
          participant: wallet.publicKey,
          treasury: treasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Donation complete:', tx)
      await fetchRaffleState()
    } catch (error) {
      console.error('Error donating:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Solana Raffle System</h1>

      <div style={{ marginBottom: '20px' }}>
        <WalletMultiButtonDynamic />
      </div>

      {wallet.connected && (
        <div>
          {/* Raffle Selection Dropdown */}
          <div style={{ marginBottom: '20px' }}>
            <select
              value={selectedRaffle || ''}
              onChange={(e) => {
                setSelectedRaffle(e.target.value)
                const raffle = raffles.find(r => r.publicKey.toString() === e.target.value)
                if (raffle) setIsAdmin(checkIfAdmin(raffle.account))
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                marginBottom: '10px',
              }}
            >
              <option value="">Select a raffle...</option>
              {raffles
                .sort((a, b) => b.publicKey.toString().localeCompare(a.publicKey.toString()))
                .map((raffle) => (
                  <option key={raffle.publicKey.toString()} value={raffle.publicKey.toString()}>
                    Raffle {raffle.publicKey.toString().slice(0, 8)}... ({raffle.account.totalSol.toString() / LAMPORTS_PER_SOL} SOL)
                  </option>
                ))}
            </select>
          </div>

          {/* Admin Panel */}
          {isAdmin && (
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <h3>Admin Controls</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleCreateRaffle}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Create New Raffle
                </button>
                <button
                  onClick={handleSelectWinner}
                  disabled={loading || !selectedRaffle}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Select Winner
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={loading || !selectedRaffle}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Withdraw Funds
                </button>
              </div>
            </div>
          )}

          {/* Selected Raffle Information */}
          {selectedRaffle && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '20px' }}>
                <h3>Participate in Raffle</h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    type="number"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    min="0.1"
                    step="0.1"
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                  <span>SOL</span>
                  <button
                    onClick={handleDonate}
                    disabled={loading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#9c27b0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Donate
                  </button>
                </div>
              </div>

              {/* Raffle Details */}
              {raffles.map((raffle) =>
                raffle.publicKey.toString() === selectedRaffle ? (
                  <div key={raffle.publicKey.toString()} style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
                    <h3>Raffle Information</h3>
                    <div style={{ marginBottom: '15px' }}>
                      <p>Total Pool: {raffle.account.totalSol.toString() / LAMPORTS_PER_SOL} SOL</p>
                      <p>Status: {raffle.account.winnerSelected ? 'Completed' : 'Active'}</p>
                      <p>Participants: {raffle.account.participantCount.toString()}</p>
                      {wallet.publicKey && (
                        <p>Your Win Probability: {calculateWinningProbability(raffle.account, wallet.publicKey)}</p>
                      )}
                      {raffle.account.winnerSelected && (
                        <p>Winner: {raffle.account.winner.toString()}</p>
                      )}
                    </div>

                    <h4>Participants</h4>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '14px' }}>
                      {raffle.account.participants.map((participant, index) => (
                        <div key={index} style={{ marginBottom: '5px', padding: '5px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                          <span>{participant.wallet.toString().slice(0, 8)}...</span>
                          <span style={{ float: 'right' }}>
                            {participant.tokens.toString()} tickets ({calculateWinningProbability(raffle.account, participant.wallet)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <WalletContextProvider>
      <SolanaRaffleApp />
    </WalletContextProvider>
  )
}