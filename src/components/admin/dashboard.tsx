import { Clock, Coins, TrendingUp, Zap, Users, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { PublicKey } from '@solana/web3.js'
import { Program, web3, BN, AnchorProvider, Idl, IdlTypes } from '@project-serum/anchor'
import { useConnection, useWallet, WalletContextState } from '@solana/wallet-adapter-react'
import { AnchorWallet } from '@solana/wallet-adapter-react'

type RaffleIDL = typeof idl;
type ProgramType = Program<RaffleIDL>;
type ProgramAccount = IdlTypes<RaffleIDL>['RaffleAccount'];

interface RaffleAccount {
  publicKey: web3.PublicKey;
  id: web3.PublicKey;
  authority: web3.PublicKey;
  winner?: web3.PublicKey;
  participants: web3.PublicKey[];
  prize: BN;
  participantCount: number;
  isComplete: boolean;
  timestamp: BN;
  totalSol?: BN;
  winnerSelected?: boolean;
  admin?: web3.PublicKey;
  adminAuth1?: web3.PublicKey;
  adminAuth2?: web3.PublicKey;
  adminAuth3?: web3.PublicKey;
  data?: ProgramAccount;
}
import { Button } from '@/components/ui/button'
import dynamic from 'next/dynamic'
import '@solana/wallet-adapter-react-ui/styles.css' // Import wallet button styles
import '@solana/wallet-adapter-react-ui/styles.css'

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false },
)

interface AdminDashboardProps {
  tokensMinted?: number
  totalSolDonated?: number
  totalTBHFMinted?: number
  raffleCountdown?: number
  timeSinceLastDraw?: string
}

interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: string
    positive?: boolean
  }
  gaugeValue?: number
}

interface GaugeProps extends Omit<React.SVGProps<SVGSVGElement>, 'className'> {
  value: number
  size?: number | string
  gapPercent?: number
  strokeWidth?: number
  equal?: boolean
  showValue?: boolean
  primary?: 'danger' | 'warning' | 'success' | 'info' | string | { [key: number]: string }
  secondary?: 'danger' | 'warning' | 'success' | 'info' | string | { [key: number]: string }
  transition?: {
    length?: number
    step?: number
    delay?: number
  }
  className?:
    | string
    | {
        svgClassName?: string
        primaryClassName?: string
        secondaryClassName?: string
        textClassName?: string
      }
}

function Gauge({
  value,
  size = '100%',
  gapPercent = 5,
  strokeWidth = 10,
  equal = false,
  showValue = true,
  primary,
  secondary,
  transition = {
    length: 1000,
    step: 200,
    delay: 0,
  },
  className,
  ...props
}: GaugeProps) {
  const strokePercent = value
  const circleSize = 100
  const radius = circleSize / 2 - strokeWidth / 2
  const circumference = 2 * Math.PI * radius
  const percentToDegree = 360 / 100
  const percentToPx = circumference / 100
  const offsetFactor = equal ? 0.5 : 0
  const offsetFactorSecondary = 1 - offsetFactor

  const primaryStrokeDasharray = () => {
    if (offsetFactor > 0 && strokePercent > 100 - gapPercent * 2 * offsetFactor) {
      const subtract = -strokePercent + 100
      return `${Math.max(strokePercent * percentToPx - subtract * percentToPx, 0)} ${circumference}`
    } else {
      const subtract = gapPercent * 2 * offsetFactor
      return `${Math.max(strokePercent * percentToPx - subtract * percentToPx, 0)} ${circumference}`
    }
  }

  const secondaryStrokeDasharray = () => {
    if (offsetFactorSecondary < 1 && strokePercent < gapPercent * 2 * offsetFactorSecondary) {
      const subtract = strokePercent
      return `${Math.max((100 - strokePercent) * percentToPx - subtract * percentToPx, 0)} ${circumference}`
    } else {
      const subtract = gapPercent * 2 * offsetFactorSecondary
      return `${Math.max((100 - strokePercent) * percentToPx - subtract * percentToPx, 0)} ${circumference}`
    }
  }

  const primaryTransform = () => {
    if (offsetFactor > 0 && strokePercent > 100 - gapPercent * 2 * offsetFactor) {
      const add = 0.5 * (-strokePercent + 100)
      return `rotate(${-90 + add * percentToDegree}deg)`
    } else {
      const add = gapPercent * offsetFactor
      return `rotate(${-90 + add * percentToDegree}deg)`
    }
  }

  const secondaryTransform = () => {
    if (offsetFactorSecondary < 1 && strokePercent < gapPercent * 2 * offsetFactorSecondary) {
      const subtract = 0.5 * strokePercent
      return `rotate(${360 - 90 - subtract * percentToDegree}deg) scaleY(-1)`
    } else {
      const subtract = gapPercent * offsetFactorSecondary
      return `rotate(${360 - 90 - subtract * percentToDegree}deg) scaleY(-1)`
    }
  }

  const primaryStroke = () => {
    if (!primary) {
      return strokePercent <= 25
        ? '#dc2626'
        : strokePercent <= 50
          ? '#f59e0b'
          : strokePercent <= 75
            ? '#3b82f6'
            : '#22c55e'
    } else if (typeof primary === 'string') {
      return primary === 'danger'
        ? '#dc2626'
        : primary === 'warning'
          ? '#f59e0b'
          : primary === 'info'
            ? '#3b82f6'
            : primary === 'success'
              ? '#22c55e'
              : primary
    } else if (typeof primary === 'object') {
      const primaryKeys = Object.keys(primary).sort((a, b) => Number(a) - Number(b))
      let primaryStroke = ''
      for (let i = 0; i < primaryKeys.length; i++) {
        const currentKey = Number(primaryKeys[i])
        const nextKey = Number(primaryKeys[i + 1])

        if (strokePercent >= currentKey && (strokePercent < nextKey || !nextKey)) {
          primaryStroke = primary[currentKey] || ''

          if (['danger', 'warning', 'success', 'info'].includes(primaryStroke)) {
            primaryStroke =
              {
                danger: '#dc2626',
                warning: '#f59e0b',
                info: '#3b82f6',
                success: '#22c55e',
              }[primaryStroke] || primaryStroke
          }

          break
        }
      }
      return primaryStroke
    }
  }

  const secondaryStroke = () => {
    if (!secondary) {
      return '#9ca3af'
    } else if (typeof secondary === 'string') {
      return secondary === 'danger'
        ? '#fecaca'
        : secondary === 'warning'
          ? '#fde68a'
          : secondary === 'info'
            ? '#bfdbfe'
            : secondary === 'success'
              ? '#bbf7d0'
              : secondary
    } else if (typeof secondary === 'object') {
      const stroke_percent_secondary = 100 - strokePercent
      const secondaryKeys = Object.keys(secondary).sort((a, b) => Number(a) - Number(b))
      let secondaryStroke = ''

      for (let i = 0; i < secondaryKeys.length; i++) {
        const currentKey = Number(secondaryKeys[i])
        const nextKey = Number(secondaryKeys[i + 1])

        if (stroke_percent_secondary >= currentKey && (stroke_percent_secondary < nextKey || !nextKey)) {
          secondaryStroke = secondary[currentKey] || ''

          if (['danger', 'warning', 'success', 'info'].includes(secondaryStroke)) {
            secondaryStroke =
              {
                danger: '#fecaca',
                warning: '#fde68a',
                info: '#bfdbfe',
                success: '#bbf7d0',
              }[secondaryStroke] || secondaryStroke
          }

          break
        }
      }
      return secondaryStroke
    }
  }

  const primaryOpacity = () => {
    if (
      offsetFactor > 0 &&
      strokePercent < gapPercent * 2 * offsetFactor &&
      strokePercent < gapPercent * 2 * offsetFactorSecondary
    ) {
      return 0
    } else return 1
  }

  const secondaryOpacity = () => {
    if (
      (offsetFactor === 0 && strokePercent > 100 - gapPercent * 2) ||
      (offsetFactor > 0 &&
        strokePercent > 100 - gapPercent * 2 * offsetFactor &&
        strokePercent > 100 - gapPercent * 2 * offsetFactorSecondary)
    ) {
      return 0
    } else return 1
  }

  const circleStyles: React.CSSProperties = {
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeDashoffset: 0,
    strokeWidth: strokeWidth,
    transition: `all ${transition?.length}ms ease ${transition?.delay}ms`,
    transformOrigin: '50% 50%',
    shapeRendering: 'geometricPrecision',
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${circleSize} ${circleSize}`}
      shapeRendering="crispEdges"
      width={size}
      height={size}
      style={{ userSelect: 'none' }}
      strokeWidth={2}
      fill="none"
      className={cn('', typeof className === 'string' ? className : className?.svgClassName)}
      {...props}
    >
      <circle
        cx={circleSize / 2}
        cy={circleSize / 2}
        r={radius}
        style={{
          ...circleStyles,
          strokeDasharray: secondaryStrokeDasharray(),
          transform: secondaryTransform(),
          stroke: secondaryStroke(),
          opacity: secondaryOpacity(),
        }}
        className={cn('', typeof className === 'object' && className?.secondaryClassName)}
      />

      <circle
        cx={circleSize / 2}
        cy={circleSize / 2}
        r={radius}
        style={{
          ...circleStyles,
          strokeDasharray: primaryStrokeDasharray(),
          transform: primaryTransform(),
          stroke: primaryStroke(),
          opacity: primaryOpacity(),
        }}
        className={cn('', typeof className === 'object' && className?.primaryClassName)}
      />

      {showValue && (
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          alignmentBaseline="central"
          fill="currentColor"
          fontSize={36}
          className={cn('font-semibold', typeof className === 'object' && className?.textClassName)}
        >
          {Math.round(strokePercent)}
        </text>
      )}
    </svg>
  )
}

function MetricCard({ title, value, icon, trend, gaugeValue }: MetricCardProps) {
  return (
    <div className="flex gap-0 flex-col justify-between p-6 border border-border rounded-xl bg-background">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
        {gaugeValue !== undefined && (
          <div className="w-16 h-16">
            <Gauge size="100%" value={gaugeValue} primary="primary" strokeWidth={8} />
          </div>
        )}
      </div>
      <h2 className="text-3xl tracking-tighter font-medium text-foreground">{value}</h2>
      <div className="flex justify-between items-end mt-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        {trend && (
          <span className={cn('text-xs font-medium', trend.positive ? 'text-success' : 'text-destructive')}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </div>
  )
}

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

// Function to find treasury PDA
const findTreasuryPDA = (programId: web3.PublicKey): [web3.PublicKey, number] => {
  return PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId)
}

const AdminDashboard = ({
  tokensMinted: initialTokensMinted = 0,
  totalSolDonated: initialTotalSolDonated = 0,
  totalTBHFMinted: initialTotalTBHFMinted = 0,
  raffleCountdown: initialRaffleCountdown = 100000,
  timeSinceLastDraw: initialTimeSinceLastDraw = 'Never',
}: AdminDashboardProps) => {
  const [tokensMinted, setTokensMinted] = useState<number>(initialTokensMinted)
  const [totalSolDonated, setTotalSolDonated] = useState<number>(initialTotalSolDonated)
  const [totalTBHFMinted, setTotalTBHFMinted] = useState<number>(initialTotalTBHFMinted)
  const [raffleCountdown, setRaffleCountdown] = useState(initialRaffleCountdown)
  const [timeSinceLastDraw, setTimeSinceLastDraw] = useState(initialTimeSinceLastDraw)
  const [raffleAccounts, setRaffleAccounts] = useState<RaffleAccount[]>([])
  const [completedRaffles, setCompletedRaffles] = useState<RaffleAccount[]>([])
  const [activeRaffle, setActiveRaffle] = useState<RaffleAccount | null>(null)
  const [selectedRaffle, setSelectedRaffle] = useState<RaffleAccount | null>(null)
  const [treasuryBalance, setTreasuryBalance] = useState<number>(0)
  const [totalParticipants, setTotalParticipants] = useState<number>(0)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [announcement, setAnnouncement] = useState<{
    message: string
    address?: string
    type?: 'success' | 'error'
    solAmount?: string | null
  } | null>(null)
  const [program, setProgram] = useState<ProgramType | null>(null)
  const { connection } = useConnection()
  const wallet = useWallet() as WalletContextState & AnchorWallet

  const initializeProgram = useCallback(async (): Promise<void> => {
    if (!wallet.publicKey || !connection) return
    try {
      const provider = new AnchorProvider(
        connection,
        wallet as AnchorWallet,
        { commitment: 'processed' }
      )
      const program = new Program(idl as RaffleIDL, programId, provider)
      setProgram(program)
      await fetchRaffleAccounts(program)
    } catch (error: unknown) {
      console.error('Failed to initialize program:', error)
      setStatusMessage(`Error initializing program: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  useEffect(() => {
    if (wallet.publicKey && connection) {
      console.log('Admin wallet connected:', wallet.publicKey.toString())
      initializeProgram()
    }
  }, [wallet.publicKey, connection])

  const fetchRaffleAccounts = async (programInstance: ProgramType) => {
    try {
      setLoading(true)

      const accounts = await programInstance.account.raffle.all()
      const raffleAccounts = accounts.map((acc: any) => {
        const account = acc.account as ProgramAccount;
        return {
          publicKey: acc.publicKey,
          id: acc.publicKey,
          authority: account.authority,
          winner: account.winner,
          participants: account.participants,
          prize: account.prize,
          participantCount: account.participantCount.toNumber(),
          isComplete: account.isComplete,
          timestamp: account.timestamp,
          totalSol: account.totalSol,
          winnerSelected: account.winnerSelected,
          admin: account.admin,
          adminAuth1: account.adminAuth1,
          adminAuth2: account.adminAuth2,
          adminAuth3: account.adminAuth3,
          data: account
        } as RaffleAccount;
      })
      setRaffleAccounts(raffleAccounts)

      let totalPoolSize = 0
      let activeParticipants = 0
      let latestRaffleDate = null
      const allParticipants = new Set()

      const completed = accounts
        .filter((acc) => acc.account.winnerSelected)
        .map((acc) => ({
          id: acc.publicKey,
          publicKey: acc.publicKey,
          winner: acc.account.winner.toString(),
          admin: acc.account.admin.toString(),
          prize: new BN(acc.account.totalSol.toNumber() / 2),
          totalSol: acc.account.totalSol,
          participantCount: acc.account.participantCount.toNumber(),
          date: new Date(),
        }))

      completed.sort((a, b) => b.date.getTime() - a.date.getTime())
      setCompletedRaffles(completed)

      if (completed.length > 0) {
        latestRaffleDate = completed[0].date

        totalPoolSize = completed.reduce((sum, raffle) => sum + raffle.totalSol.toNumber(), 0)

        // Set time since last draw
        const now = new Date()
        const diffTime = Math.abs(now.getTime() - latestRaffleDate.getTime())
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60))

        setTimeSinceLastDraw(`${diffDays}d ${diffHours}h ${diffMinutes}m`)
      }

      // Get active raffle data
      const active = accounts.find((acc) => !acc.account.winnerSelected)
      if (active) {
        activeParticipants = active.account.participantCount.toNumber()
        totalPoolSize += active.account.totalSol.toNumber()

        setActiveRaffle({
          id: active.publicKey,
          data: active.account,
          progress: calculateProgress(active.account.totalSol),
        })

        setSelectedRaffle(active.publicKey)

        // Add to total participants count
        active.account.participants.forEach((p) => {
          allParticipants.add(p.wallet.toString())
        })

        // Check if connected wallet is admin
        if (wallet.publicKey) {
          const isAdminWallet =
            active.account.admin.equals(wallet.publicKey) ||
            active.account.adminAuth1.equals(wallet.publicKey) ||
            active.account.adminAuth2.equals(wallet.publicKey) ||
            active.account.adminAuth3.equals(wallet.publicKey)

          setIsAdmin(isAdminWallet)
        }

        // Get treasury balance
        try {
          const [treasuryPDA] = findTreasuryPDA(programId)
          const treasuryInfo = await programInstance.provider.connection.getAccountInfo(treasuryPDA)
          if (treasuryInfo) {
            setTreasuryBalance(treasuryInfo.lamports)
          }
        } catch (err) {
          console.error('Error fetching treasury balance:', err)
        }
      }

      // Add all participant wallets to the set
      completed.forEach((raffle) => {
        // In a real app, you'd want to access the participants array
        // We're using participantCount as a proxy
        for (let i = 0; i < raffle.participantCount; i++) {
          allParticipants.add(`unique-participant-${i}`) // Placeholder
        }
      })

      setTotalParticipants(allParticipants.size)

      // Convert lamports to SOL
      setTotalSolDonated(totalPoolSize / web3.LAMPORTS_PER_SOL)

      // Set tokens minted (using totalSol as a proxy in this example)
      const tokensFromCurrentRaffle = active ? active.account.totalSol.toNumber() / 10000000 : 0
      setTokensMinted(Math.floor(tokensFromCurrentRaffle * 100))

      // Total TBHF tokens as a function of all SOL donated
      setTotalTBHFMinted(Math.floor((totalPoolSize / web3.LAMPORTS_PER_SOL) * 100))

      // Raffle countdown (a simple formula for this example)
      const countdown = 100000 - tokensMinted
      setRaffleCountdown(countdown > 0 ? countdown : 0)

      setLoading(false)
    } catch (error: unknown) {
      console.error('Error getting raffle state:', error instanceof Error ? error.message : String(error))
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setLoading(false)
      return null
    }
  }

  const calculateProgress = (totalSol: BN): number => {
    if (!totalSol) return 0
    try {
      return Math.min(100, (totalSol.toNumber() / THRESHOLD_LAMPORTS) * 100)
    } catch (e) {
      console.log(e)
      return 0
    }
  }

  const formatSOL = (lamports: BN | number): string => {
    if (!lamports) return '0'
    try {
      return (lamports / web3.LAMPORTS_PER_SOL).toFixed(4)
    } catch (e) {
      console.log(e)
      return 'Amount too large'
    }
  }

  // Admin Actions
  const selectWinner = async () => {
    if (!wallet.publicKey) {
      setAnnouncement({
        message: '❌ Please connect your wallet first',
        type: 'error',
      })
      return
    }

    if (!program || !selectedRaffle || !activeRaffle) {
      setAnnouncement({
        message: '❌ Program or raffle not initialized',
        type: 'error',
      })
      return
    }

    try {
      if (!program) {
        throw new Error('Program not initialized')
      }

      setLoading(true)
      setStatusMessage('Selecting winner...')

      const [treasury] = findTreasuryPDA(programId)
      const recentSlotHashPubkey = new PublicKey('SysvarS1otHashes111111111111111111111111111')

      // Use first participant as potential winner account
      const winnerAccount = activeRaffle.data.participants[0].wallet

      // Call the selectWinner instruction
      const tx = await program.methods
        .selectWinner()
        .accounts({
          raffleState: selectedRaffle,
          admin: wallet.publicKey,
          treasury: treasury,
          winnerAccount: winnerAccount,
          recentSlotHash: recentSlotHashPubkey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc({ commitment: 'confirmed' })

      setStatusMessage(`Winner selected! TX: ${tx.substring(0, 8)}...`)

      // Refresh the raffle state
      setTimeout(() => fetchRaffleAccounts(program), 2000)

      setLoading(false)
    } catch (error) {
      console.error('Error selecting winner:', error)
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setLoading(false)
    }
  }

  const withdrawFunds = async (): Promise<void> => {
    if (!program || !wallet.publicKey || !selectedRaffle || !activeRaffle) return

    try {
      setLoading(true)
      setStatusMessage('Withdrawing funds...')

      const [treasury] = findTreasuryPDA(programId)
      const payoutWallet = activeRaffle.data.payoutWallet

      // Call the withdrawFunds instruction
      const tx = await program.methods
        .withdrawFunds()
        .accounts({
          raffleState: selectedRaffle,
          admin: wallet.publicKey,
          treasury: treasury,
          payoutWallet: payoutWallet,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc({ commitment: 'confirmed' })

      setStatusMessage(`Funds withdrawn! TX: ${tx.substring(0, 8)}...`)

      // Refresh the raffle state
      setTimeout(() => fetchRaffleAccounts(program), 2000)

      setLoading(false)
    } catch (error) {
      console.error('Error withdrawing funds:', error)
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setLoading(false)
    }
  }

  const initializeRaffle = async (prize: number) => {
    if (!program?.programId || !wallet.publicKey) return null

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
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([raffleKeypair])
        .rpc({ commitment: 'confirmed' })

      setStatusMessage(`Raffle created! TX: ${tx.substring(0, 8)}...`)

      // Wait for blockchain to update
      setTimeout(async () => {
        await fetchRaffleAccounts(program)
        setSelectedRaffle(raffleKeypair.publicKey)
      }, 2000)

      setLoading(false)
      return raffleKeypair
    } catch (error: unknown) {
      console.error('Error initializing program:', error instanceof Error ? error.message : String(error))
      setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setLoading(false)
      return null
    }
  }

  return (
    <div className="w-full p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Raffle Dashboard</h1>
          <p className="text-muted-foreground">Monitor your raffle metrics and performance</p>
        </div>
        <WalletMultiButtonDynamic />
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p>Loading dashboard data...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <MetricCard
              title="Tokens Minted Toward Next Raffle"
              value={tokensMinted.toLocaleString()}
              icon={<Zap className="w-5 h-5" />}
              gaugeValue={Math.min((tokensMinted / raffleCountdown) * 100, 100)}
            />

            <MetricCard
              title="Total SOL Donated"
              value={`${totalSolDonated.toLocaleString()} SOL`}
              icon={<Coins className="w-5 h-5" />}
              trend={{ value: '12.5%', positive: true }}
            />

            <MetricCard
              title="Total TBHF Tokens Minted"
              value={totalTBHFMinted.toLocaleString()}
              icon={<TrendingUp className="w-5 h-5" />}
              trend={{ value: '8.3%', positive: true }}
            />

            <MetricCard
              title="Total Unique Participants"
              value={totalParticipants.toLocaleString()}
              icon={<Users className="w-5 h-5" />}
              trend={{ value: '5.2%', positive: true }}
            />

            <MetricCard
              title="Treasury Balance"
              value={`${formatSOL(treasuryBalance)} SOL`}
              icon={<Coins className="w-5 h-5" />}
            />

            <MetricCard title="Time Since Last Draw" value={timeSinceLastDraw} icon={<Clock className="w-5 h-5" />} />
          </div>

          {isAdmin && (
            <div className="border rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Admin Controls</h2>

              {/* Raffle Selection */}
              {raffleAccounts.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Select Raffle</label>
                  <select
                    className="w-full p-2 border rounded"
                    onChange={(e) => {
                      const selected = e.target.value
                      if (selected) {
                        setSelectedRaffle(new PublicKey(selected))
                      }
                    }}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={async () => {
                    try {
                      const raffleKeypair = await initializeRaffle()
                      if (raffleKeypair) {
                        setAnnouncement({
                          message:
                            '✅ New Raffle contract created successfully!\nCopy this address to track your raffle:',
                          address: raffleKeypair.publicKey.toString(),
                        })
                      }
                    } catch (error) {
                      setAnnouncement({
                        message: '❌ Failed to create raffle contract: ' + error.message,
                      })
                    }
                  }}
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Create New Raffle
                </Button>

                <Button
                  onClick={async () => {
                    try {
                      await selectWinner()
                      // Fetch updated raffle state to get winner
                      const updatedRaffle = await program.account.RaffleState.fetch(selectedRaffle)
                      if (updatedRaffle.winner) {
                        setAnnouncement({
                          message: '🎉 Winner Selected!\nCongratulations to:',
                          address: updatedRaffle.winner.toString(),
                          type: 'success',
                          solAmount: updatedRaffle.totalSol
                            ? (updatedRaffle.totalSol.toNumber() / web3.LAMPORTS_PER_SOL).toFixed(2) + ' SOL'
                            : null,
                        })
                      }
                    } catch (error) {
                      setAnnouncement({
                        message: '❌ Failed to select winner: ' + error.message,
                        type: 'error',
                      })
                    }
                  }}
                  disabled={loading || !activeRaffle}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  Select Winner
                </Button>

                <Button
                  onClick={withdrawFunds}
                  disabled={loading || !activeRaffle || !activeRaffle.data.winnerSelected}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Withdraw Funds
                </Button>
              </div>

              {announcement && (
                <div
                  className={`mt-4 p-6 rounded-lg ${announcement.type === 'error' ? 'bg-red-50' : 'bg-green-50'} text-center`}
                >
                  <div className="text-lg font-medium mb-4">
                    {announcement.message}
                    {announcement.solAmount && (
                      <div className="mt-2 text-2xl font-bold text-green-600">{announcement.solAmount}</div>
                    )}
                  </div>
                  {announcement.address && (
                    <div
                      onClick={() => navigator.clipboard.writeText(announcement.address)}
                      className="text-sm font-mono break-all bg-white p-4 rounded border cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                    >
                      {announcement.address}
                      <div className="mt-2 text-xs text-gray-500">(Click to copy)</div>
                    </div>
                  )}
                </div>
              )}

              {statusMessage && (
                <div
                  className={`p-4 rounded mt-4 ${
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
            </div>
          )}

          {/* Recent Completed Raffles */}
          {completedRaffles.length > 0 && (
            <div className="border rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Completed Raffles</h2>
                {completedRaffles.length > 5 && (
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Raffle ID</th>
                      <th className="text-left py-2 px-4">Winner</th>
                      <th className="text-right py-2 px-4">Prize</th>
                      <th className="text-right py-2 px-4">Participants</th>
                      <th className="text-center py-2 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedRaffles.slice(0, 5).map((raffle) => (
                      <tr key={raffle.id.toString()} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{raffle.id.toString().slice(0, 8)}...</td>
                        <td className="py-3 px-4">
                          {raffle.winner?.toString().slice(0, 4)}...${raffle.winner?.toString().slice(-4)}
                        </td>
                        <td className="py-3 px-4 text-right">{formatSOL(raffle.prize)} SOL</td>
                        <td className="py-3 px-4 text-right">{raffle.participantCount}</td>
                        <td className="py-3 px-4 text-center">
                          <Button variant="outline" size="sm" asChild className="text-xs">
                            <a
                              href={`https://explorer.solana.com/address/${raffle.id.toString()}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View on Explorer <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AdminDashboard
