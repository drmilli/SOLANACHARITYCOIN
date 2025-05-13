import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaRaffle } from "../target/types/solana_raffle";
import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_SLOT_HASHES_PUBKEY } from "@solana/web3.js";

export class RaffleClient {
  program: Program<SolanaRaffle>;
  raffleStateAddress: PublicKey;
  treasuryAddress: PublicKey;

  constructor(
    program: Program<SolanaRaffle>,
    raffleStateAddress: PublicKey
  ) {
    this.program = program;
    this.raffleStateAddress = raffleStateAddress;
    this.treasuryAddress = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    )[0];
  }

  static async initialize(
    program: Program<SolanaRaffle>,
    admin: Keypair,
    raffleStateAccount: Keypair
  ): Promise<RaffleClient> {
    const tx = await program.methods
      .initialize()
      .accounts({
        raffleState: raffleStateAccount.publicKey,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin, raffleStateAccount])
      .rpc();

    console.log("Raffle initialized with transaction signature", tx);
    
    return new RaffleClient(program, raffleStateAccount.publicKey);
  }

  async donate(participant: Keypair, amountLamports: number): Promise<string> {
    const tx = await this.program.methods
      .donate(new anchor.BN(amountLamports))
      .accounts({
        raffleState: this.raffleStateAddress,
        participant: participant.publicKey,
        treasury: this.treasuryAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([participant])
      .rpc();

    return tx;
  }

  async selectWinner(admin: Keypair, winnerAddress: PublicKey): Promise<string> {
    const tx = await this.program.methods
      .selectWinner()
      .accounts({
        raffleState: this.raffleStateAddress,
        admin: admin.publicKey,
        treasury: this.treasuryAddress,
        winnerAccount: winnerAddress,
        recentSlotHash: SYSVAR_SLOT_HASHES_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    return tx;
  }

  async withdrawFunds(admin: Keypair, payoutWalletAddress: PublicKey): Promise<string> {
    const tx = await this.program.methods
      .withdrawFunds()
      .accounts({
        raffleState: this.raffleStateAddress,
        admin: admin.publicKey,
        treasury: this.treasuryAddress,
        payoutWallet: payoutWalletAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    return tx;
  }

  async getRaffleState(): Promise<any> {
    return await this.program.account.raffleState.fetch(this.raffleStateAddress);
  }

  async getTreasuryBalance(connection: Connection): Promise<number> {
    return await connection.getBalance(this.treasuryAddress);
  }

  async getParticipants(): Promise<any[]> {
    const raffleState = await this.getRaffleState();
    return raffleState.participants;
  }

  async isWinnerSelected(): Promise<boolean> {
    const raffleState = await this.getRaffleState();
    return raffleState.winnerSelected;
  }

  async getWinner(): Promise<PublicKey | null> {
    const raffleState = await this.getRaffleState();
    if (!raffleState.winnerSelected) {
      return null;
    }
    return raffleState.winner;
  }

  async isThresholdReached(): Promise<boolean> {
    const raffleState = await this.getRaffleState();
    return raffleState.thresholdReached;
  }

  async getTotalSol(): Promise<number> {
    const raffleState = await this.getRaffleState();
    return raffleState.totalSol.toNumber();
  }
}