# Solana 50/50 Raffle Program

> **Note**: This is a sample project demonstrating how to build a Solana program according to the requirements in rules.txt.

This Solana program implements a 50/50 raffle mechanism according to the specified rules. The program allows users to donate SOL, with each participant receiving 1 token for every 0.01 SOL contributed. Once the treasury reaches 1,000 SOL (1,000,000,000,000 lamports), a winner is randomly selected to receive 50% of the funds, while the other 50% remains in the treasury for withdrawal by authorized admins.

## Features

- Tracks all participants and their token allocations
- Gives 1 token per 0.01 SOL donated
- Implements multi-signature admin access with three authorized admin keys
- Automatically selects a winner when the 1,000 SOL threshold is reached
- Blacklists winners to prevent them from participating in future raffles
- Allows authorized admins to withdraw funds to a designated payout wallet

## Program Structure

The program consists of the following main components:

1. **RaffleState**: A state account storing all raffle data including:
   - Admin wallets
   - Treasury information
   - Participant list and token allocations
   - Blacklist of previous winners
   - Current raffle status

2. **Instructions**:
   - `initialize`: Sets up the raffle with admins and configuration
   - `donate`: Allows users to donate SOL and receive tokens
   - `select_winner`: Selects a random winner based on token weight when threshold is reached
   - `withdraw_funds`: Allows admins to withdraw funds to the designated wallet

## How to Deploy

### Prerequisites

- Solana CLI tools (v1.15.0 or higher)
- Anchor Framework (v0.28.0 or higher)
- A funded Solana wallet for deployment

### Steps

1. **Clone the project**:
   ```bash
   git clone <repository-url>
   cd solana-raffle
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the program**:
   ```bash
   anchor build
   ```

4. **Get the program ID**:
   ```bash
   solana address -k target/deploy/raffle-keypair.json
   ```

5. **Update the program ID** in `lib.rs` and `Anchor.toml` with the output from the previous step.

6. **Deploy to a Solana network** (devnet example):
   ```bash
   anchor deploy --provider.cluster devnet
   ```

## How to Use

### Initialize the Raffle

```javascript
const tx = await program.methods
  .initialize()
  .accounts({
    raffleState: raffleStateAccount.publicKey,
    admin: adminWallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([adminWallet, raffleStateAccount])
  .rpc();
```

### Donate to the Raffle

```javascript
const treasuryPDA = await PublicKey.findProgramAddressSync(
  [Buffer.from("treasury")],
  program.programId
)[0];

const tx = await program.methods
  .donate(new BN(0.5 * LAMPORTS_PER_SOL)) // 0.5 SOL = 50 tokens
  .accounts({
    raffleState: raffleStateAccount.publicKey,
    participant: userWallet.publicKey,
    treasury: treasuryPDA,
    systemProgram: SystemProgram.programId,
  })
  .signers([userWallet])
  .rpc();
```

### Select Winner (Admin only)

```javascript
const tx = await program.methods
  .selectWinner()
  .accounts({
    raffleState: raffleStateAccount.publicKey,
    admin: adminWallet.publicKey,
    treasury: treasuryPDA,
    winnerAccount: winnerPubkey,
    recentSlotHash: SYSVAR_SLOT_HASHES_PUBKEY,
    systemProgram: SystemProgram.programId,
  })
  .signers([adminWallet])
  .rpc();
```

### Withdraw Funds (Admin only)

```javascript
const tx = await program.methods
  .withdrawFunds()
  .accounts({
    raffleState: raffleStateAccount.publicKey,
    admin: adminWallet.publicKey,
    treasury: treasuryPDA,
    payoutWallet: payoutPubkey,
    systemProgram: SystemProgram.programId,
  })
  .signers([adminWallet])
  .rpc();
```

## Security Considerations

- The program implements a pseudo-random number generator based on recent block hash and other variables for winner selection
- Only authorized admin wallets can withdraw funds or trigger the winner selection
- Winners are automatically blacklisted from future participation
- The treasury is a Program Derived Address (PDA) controlled only by the program

## License

This project is open source and available under the [MIT License](LICENSE).