'use client'

import React, { useState, useEffect } from 'react'
import { Connection, PublicKey, clusterApiUrl, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Program, BN, AnchorProvider } from '@project-serum/anchor'
import { useWallet, ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui'

import '@solana/wallet-adapter-react-ui/styles.css'
import { WalletButton } from '@/components/solana/solana-provider'

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

const programId = new PublicKey('CpG92WPSAiiJLZXdTBGBGzQDoj2NTfsLwUoiaYtqJnx7')

const findTreasuryPDA = (programId: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId)
}

const WalletContextProvider = ({ children }: { children: React.ReactNode }) => {
  const network = 'devnet'
  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
  const endpoint = clusterApiUrl(network)

  console.log('[Wallet Debug] RPC endpoint:', endpoint)

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

  useEffect(() => {
    console.log('Wallet connected:', wallet.connected)
    console.log('Wallet publicKey:', wallet.publicKey?.toString())
  }, [wallet.connected, wallet.publicKey])

  useEffect(() => {
    if (wallet.connected) {
      fetchRaffleState()
    }
  }, [wallet.connected])

  const getProgram = () => {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
    const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' })
    return new Program(idl as any, programId, provider)
  }

  const checkIfAdmin = (raffle: RaffleState) => {
    if (!wallet.publicKey) return false
    const walletKey = wallet.publicKey.toString()
    return (
      raffle.admin.toString() === walletKey ||
      raffle.adminAuth1.toString() === walletKey ||
      raffle.adminAuth2.toString() === walletKey ||
      raffle.adminAuth3.toString() === walletKey
    )
  }

  const fetchRaffleState = async () => {
    if (!wallet.connected) return

    try {
      setLoading(true)
      const program = getProgram()

      console.log('Fetching raffle state accounts...')
      const accounts = await program.account.raffleState.all()
      console.log('Found accounts:', accounts.length)

      const raffleAccounts = accounts.map((acc) => ({
        publicKey: acc.publicKey,
        account: acc.account as unknown as RaffleState,
      }))

      setRaffles(raffleAccounts)

      if (raffleAccounts.length > 0 && !selectedRaffle) {
        setSelectedRaffle(raffleAccounts[0].publicKey.toString())
        setIsAdmin(checkIfAdmin(raffleAccounts[0].account))
      }
    } catch (error) {
      console.error('Error fetching raffle state:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDonate = async () => {
    if (!wallet.connected || !wallet.publicKey || !selectedRaffle) {
      console.error('Wallet not connected or no raffle selected')
      return
    }

    try {
      setLoading(true)
      const program = getProgram()

      const lamports = parseFloat(donationAmount) * LAMPORTS_PER_SOL
      const [treasuryPDA] = findTreasuryPDA(programId)
      const raffleStateAddress = new PublicKey(selectedRaffle)

      console.log('Donating', lamports, 'lamports to treasury:', treasuryPDA.toString())
      console.log('Using raffle state account:', raffleStateAddress.toString())

      const tx = await program.methods
        .donate(new BN(lamports))
        .accounts({
          raffleState: raffleStateAddress,
          participant: wallet.publicKey,
          treasury: treasuryPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Transaction successful:', tx)
      await fetchRaffleState()
    } catch (error) {
      console.error('Error donating:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!wallet.connected || !wallet.publicKey || !selectedRaffle) {
      console.error('Wallet not connected or no raffle selected')
      return
    }

    try {
      setLoading(true)
      const program = getProgram()

      const [treasuryPDA] = findTreasuryPDA(programId)
      const raffleStateAddress = new PublicKey(selectedRaffle)
      const selectedRaffleState = raffles.find((r) => r.publicKey.toString() === selectedRaffle)

      if (!selectedRaffleState) {
        throw new Error('Selected raffle not found')
      }

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

      console.log('Withdrawal successful:', tx)
      await fetchRaffleState()
    } catch (error) {
      console.error('Error withdrawing funds:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRaffleSelect = (publicKey: string) => {
    setSelectedRaffle(publicKey)
    const selectedRaffleState = raffles.find((r) => r.publicKey.toString() === publicKey)
    if (selectedRaffleState) {
      setIsAdmin(checkIfAdmin(selectedRaffleState.account))
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Solana Raffle System</h1>

      <div style={{ marginBottom: '20px' }}>
        <WalletButton />
      </div>

      {wallet.connected && (
        <div>
          <p>Connected Wallet: {wallet.publicKey?.toString()}</p>
          <button
            onClick={fetchRaffleState}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              marginBottom: '15px',
              cursor: 'pointer',
            }}
          >
            Refresh Raffle Data
          </button>

          <div style={{ marginBottom: '20px' }}>
            <h3>Select Raffle</h3>
            <select
              value={selectedRaffle || ''}
              onChange={(e) => handleRaffleSelect(e.target.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                width: '100%',
                backgroundColor: 'white',
                fontSize: '16px',
              }}
            >
              <option value="">Select a raffle...</option>
              {[...raffles]
                .sort((a, b) => b.publicKey.toString().localeCompare(a.publicKey.toString()))
                .map((raffle) => (
                  <option key={raffle.publicKey.toString()} value={raffle.publicKey.toString()}>
                    Raffle {raffle.publicKey.toString().slice(0, 8)}... (
                    {raffle.account.totalSol.toString() / LAMPORTS_PER_SOL} SOL)
                  </option>
                ))}
            </select>
          </div>

          {selectedRaffle && (
            <>
              <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
                <h3>Donate to Raffle</h3>
                <div style={{ display: 'flex', marginBottom: '10px' }}>
                  <input
                    type="number"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    style={{
                      padding: '8px',
                      marginRight: '10px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      width: '100px',
                    }}
                    min="0.01"
                    step="0.01"
                  />
                  <span style={{ lineHeight: '36px' }}>SOL</span>
                </div>
                <button
                  onClick={handleDonate}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#512da8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Processing...' : 'Donate'}
                </button>
              </div>

              {isAdmin && (
                <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
                  <h3>Admin Actions</h3>
                  <button
                    onClick={handleWithdraw}
                    disabled={loading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#d32f2f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Processing...' : 'Withdraw Funds'}
                  </button>
                </div>
              )}

              {raffles.map(
                (raffle) =>
                  raffle.publicKey.toString() === selectedRaffle && (
                    <div
                      key={raffle.publicKey.toString()}
                      style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '4px' }}
                    >
                      <h3>Raffle Status</h3>
                      <p>Raffle ID: {raffle.publicKey.toString()}</p>
                      <p>Total SOL: {raffle.account.totalSol.toString() / LAMPORTS_PER_SOL}</p>
                      <p>Threshold reached: {raffle.account.thresholdReached ? 'Yes' : 'No'}</p>
                      <p>Winner selected: {raffle.account.winnerSelected ? 'Yes' : 'No'}</p>
                      {raffle.account.winnerSelected && <p>Winner: {raffle.account.winner.toString()}</p>}
                      <p>Total participants: {raffle.account.participantCount.toString()}</p>

                      <div style={{ marginTop: '10px' }}>
                        <h4>Participants</h4>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {raffle.account.participants.map((participant, index) => (
                            <div key={index} style={{ marginBottom: '5px' }}>
                              <small>
                                {participant.wallet.toString()} - {participant.tokens.toString()} tickets
                              </small>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ),
              )}
            </>
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
