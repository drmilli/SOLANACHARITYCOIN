import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaRaffle } from "../target/types/solana_raffle";
import { Connection, Keypair, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import { RaffleClient } from "./raffle-client";
import fs from "fs";
import path from "path";

// Load keypairs from file or generate them
function loadOrCreateKeypair(filePath: string): Keypair {
  try {
    if (fs.existsSync(filePath)) {
      const keypairBuffer = fs.readFileSync(filePath);
      return Keypair.fromSecretKey(new Uint8Array(JSON.parse(keypairBuffer.toString())));
    }
  } catch (error) {
    console.log(`Could not load keypair from ${filePath}:`, error);
  }
  
  // Generate a new keypair
  const keypair = Keypair.generate();
  const keypairString = JSON.stringify(Array.from(keypair.secretKey));
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, keypairString);
  return keypair;
}

async function main() {
  // Set up connection to devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  // Load or create keypairs
  const adminKeypair = loadOrCreateKeypair("./keypairs/admin.json");
  const raffleStateKeypair = loadOrCreateKeypair("./keypairs/raffle-state.json");
  const user1Keypair = loadOrCreateKeypair("./keypairs/user1.json");
  const user2Keypair = loadOrCreateKeypair("./keypairs/user2.json");
  
  console.log("Admin public key:", adminKeypair.publicKey.toString());
  console.log("User1 public key:", user1Keypair.publicKey.toString());
  console.log("User2 public key:", user2Keypair.publicKey.toString());
  
  // Fund accounts with SOL
  for (const kp of [adminKeypair, user1Keypair, user2Keypair]) {
    try {
      const balance = await connection.getBalance(kp.publicKey);
      
      if (balance < 0.1 * LAMPORTS_PER_SOL) {
        console.log(`Airdropping 1 SOL to ${kp.publicKey.toString()}`);
        const signature = await connection.requestAirdrop(
          kp.publicKey,
          1 * LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(signature);
      } else {
        console.log(`Account ${kp.publicKey.toString()} already has ${balance / LAMPORTS_PER_SOL} SOL`);
      }
    } catch (error) {
      console.error(`Error funding account ${kp.publicKey.toString()}:`, error);
    }
  }
  
  // Set up anchor provider
  const wallet = new anchor.Wallet(adminKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  
  // Get the program ID from Anchor.toml
  const idl = JSON.parse(fs.readFileSync("../target/idl/solana_raffle.json", "utf8"));
  const programId = new anchor.web3.PublicKey(idl.metadata.address);
  
  // Create program interface
  const program = new anchor.Program(idl, programId) as Program<SolanaRaffle>;
  
  // Initialize or connect to the raffle
  let raffleClient: RaffleClient;
  
  try {
    // Try to fetch the raffle state to check if it exists
    await program.account.raffleState.fetch(raffleStateKeypair.publicKey);
    console.log("Connecting to existing raffle...");
    raffleClient = new RaffleClient(program, raffleStateKeypair.publicKey);
  } catch (error) {
    console.log("Initializing new raffle...");
    raffleClient = await RaffleClient.initialize(program, adminKeypair, raffleStateKeypair);
  }
  
  // Example: Make a donation from user1
  try {
    const donationAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL
    console.log(`User1 donating ${donationAmount / LAMPORTS_PER_SOL} SOL...`);
    
    const tx = await raffleClient.donate(user1Keypair, donationAmount);
    console.log("Donation transaction signature:", tx);
    
    // Check updated state
    const participants = await raffleClient.getParticipants();
    console.log("Current participants:", participants);
    
    const totalSol = await raffleClient.getTotalSol();
    console.log(`Total SOL collected: ${totalSol / LAMPORTS_PER_SOL}`);
  } catch (error) {
    console.error("Error making donation:", error);
  }
  
  // Example: Make another donation from user2
  try {
    const donationAmount = 0.2 * LAMPORTS_PER_SOL; // 0.2 SOL
    console.log(`User2 donating ${donationAmount / LAMPORTS_PER_SOL} SOL...`);
    
    const tx = await raffleClient.donate(user2Keypair, donationAmount);
    console.log("Donation transaction signature:", tx);
    
    // Check updated state
    const participants = await raffleClient.getParticipants();
    console.log("Current participants:", participants);
    
    const totalSol = await raffleClient.getTotalSol();
    console.log(`Total SOL collected: ${totalSol / LAMPORTS_PER_SOL}`);
  } catch (error) {
    console.error("Error making donation:", error);
  }
  
  // Note: The following operations would normally be triggered when
  // the threshold is reached or by admins, not in this sample script
  
  // Example: Check if threshold is reached (it won't be in this demo)
  const isThresholdReached = await raffleClient.isThresholdReached();
  console.log("Threshold reached:", isThresholdReached);
  
  console.log("Example script completed successfully!");
}

// Run the example
main().catch(console.error);