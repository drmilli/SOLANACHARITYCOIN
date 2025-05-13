import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaRaffle } from "../target/types/solana_raffle";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, SYSVAR_SLOT_HASHES_PUBKEY } from "@solana/web3.js";
import { expect } from "chai";

describe("solana-raffle", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaRaffle as Program<SolanaRaffle>;
  const adminWallet = anchor.web3.Keypair.generate();
  const userWallet1 = anchor.web3.Keypair.generate();
  const userWallet2 = anchor.web3.Keypair.generate();
  const raffleStateAccount = anchor.web3.Keypair.generate();
  
  // PDA for treasury
  const [treasuryPDA, treasuryBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  );

  // Airdrop SOL to wallets before tests
  before(async () => {
    // Airdrop to admin
    const airdropSignature1 = await provider.connection.requestAirdrop(
      adminWallet.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature1);
    
    // Airdrop to user1
    const airdropSignature2 = await provider.connection.requestAirdrop(
      userWallet1.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature2);
    
    // Airdrop to user2
    const airdropSignature3 = await provider.connection.requestAirdrop(
      userWallet2.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature3);
  });

  it("Initializes the raffle", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        raffleState: raffleStateAccount.publicKey,
        admin: adminWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([adminWallet, raffleStateAccount])
      .rpc();
    
    console.log("Raffle initialized with transaction signature", tx);
    
    // Fetch the raffle state to verify
    const raffleState = await program.account.raffleState.fetch(
      raffleStateAccount.publicKey
    );
    
    expect(raffleState.admin.toString()).to.equal(adminWallet.publicKey.toString());
    expect(raffleState.totalSol.toNumber()).to.equal(0);
    expect(raffleState.thresholdReached).to.be.false;
    expect(raffleState.winnerSelected).to.be.false;
    expect(raffleState.participantCount.toNumber()).to.equal(0);
  });

  it("Allows a user to donate", async () => {
    const donationAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL
    
    const tx = await program.methods
      .donate(new anchor.BN(donationAmount))
      .accounts({
        raffleState: raffleStateAccount.publicKey,
        participant: userWallet1.publicKey,
        treasury: treasuryPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([userWallet1])
      .rpc();
    
    console.log("User donated with transaction signature", tx);
    
    // Fetch the raffle state to verify
    const raffleState = await program.account.raffleState.fetch(
      raffleStateAccount.publicKey
    );
    
    expect(raffleState.totalSol.toNumber()).to.equal(donationAmount);
    expect(raffleState.participantCount.toNumber()).to.equal(1);
    
    // User should have received 10 tokens (0.1 SOL = 10 tokens)
    const participant = raffleState.participants[0];
    expect(participant.wallet.toString()).to.equal(userWallet1.publicKey.toString());
    expect(participant.tokens.toNumber()).to.equal(10);
  });

  it("Allows multiple users to donate", async () => {
    const donationAmount = 0.05 * LAMPORTS_PER_SOL; // 0.05 SOL
    
    const tx = await program.methods
      .donate(new anchor.BN(donationAmount))
      .accounts({
        raffleState: raffleStateAccount.publicKey,
        participant: userWallet2.publicKey,
        treasury: treasuryPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([userWallet2])
      .rpc();
    
    console.log("Second user donated with transaction signature", tx);
    
    // Fetch the raffle state to verify
    const raffleState = await program.account.raffleState.fetch(
      raffleStateAccount.publicKey
    );
    
    expect(raffleState.totalSol.toNumber()).to.equal(0.15 * LAMPORTS_PER_SOL);
    expect(raffleState.participantCount.toNumber()).to.equal(2);
    
    // Second user should have received 5 tokens (0.05 SOL = 5 tokens)
    const participant2 = raffleState.participants[1];
    expect(participant2.wallet.toString()).to.equal(userWallet2.publicKey.toString());
    expect(participant2.tokens.toNumber()).to.equal(5);
  });

  // Note: We can't fully test the select_winner function without mocking the 1,000 SOL threshold
  // but we can verify that it prevents calling before threshold is reached

  it("Prevents selecting a winner before threshold", async () => {
    try {
      await program.methods
        .selectWinner()
        .accounts({
          raffleState: raffleStateAccount.publicKey,
          admin: adminWallet.publicKey,
          treasury: treasuryPDA,
          winnerAccount: userWallet1.publicKey, // Doesn't matter for this test
          recentSlotHash: SYSVAR_SLOT_HASHES_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .signers([adminWallet])
        .rpc();
      
      // Should not reach here
      expect.fail("Should have thrown an error");
    } catch (error) {
      // Expect the specific error about threshold not reached
      expect(error.toString()).to.include("ThresholdNotReached");
    }
  });
});