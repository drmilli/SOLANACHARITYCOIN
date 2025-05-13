use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use solana_program::hash::{hash, Hash};
use std::convert::TryInto;
use std::str::FromStr;

declare_id!("3pwsHuESbtUtQ9A9ChHp9y64VTJAEzuRQmxmrEiBLR4d");

#[program]
pub mod raffle {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let raffle_state = &mut ctx.accounts.raffle_state;
        raffle_state.admin = *ctx.accounts.admin.key;
        raffle_state.treasury = Pubkey::default();
        raffle_state.admin_auth_1 =
            Pubkey::from_str("CFn1rRSsEErL6odfyvdqpAMuJr5d2Bwk4whiAsMukJjK").unwrap();
        raffle_state.admin_auth_2 =
            Pubkey::from_str("8rEGjzfq9u7FG3stzv4KjcNb2Vnvu8TeRJnYM7SAadYf").unwrap();
        raffle_state.admin_auth_3 =
            Pubkey::from_str("BKLfwUHia9MwnDhnJUj6bMyguVxcn96SNGsEgUVRhjdx").unwrap();
        raffle_state.payout_wallet =
            Pubkey::from_str("7wqYGrDJmYPdqeoqsM2bdNGb6yhoZSQzZiwyEEJBCgq6").unwrap();
        raffle_state.total_sol = 0;
        raffle_state.threshold_reached = false;
        raffle_state.winner_selected = false;
        raffle_state.winner = Pubkey::default();
        raffle_state.participants = vec![];
        raffle_state.participant_count = 0;
        raffle_state.blacklist = vec![];

        Ok(())
    }

    pub fn donate(ctx: Context<Donate>, amount: u64) -> Result<()> {
        let raffle_state = &mut ctx.accounts.raffle_state;
        let participant = ctx.accounts.participant.key();

        // Check if participant is blacklisted
        for blacklisted in raffle_state.blacklist.iter() {
            if participant == *blacklisted {
                return Err(ErrorCode::BlacklistedParticipant.into());
            }
        }

        // Transfer SOL to treasury
        let transfer_instruction = solana_program::system_instruction::transfer(
            &ctx.accounts.participant.key(),
            &ctx.accounts.treasury.key(),
            amount,
        );

        solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.participant.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Update raffle state
        raffle_state.treasury = ctx.accounts.treasury.key();
        raffle_state.total_sol = raffle_state.total_sol.checked_add(amount).unwrap();

        // Each 0.01 SOL = 1 token
        let tokens = amount / 10_000_000; // 0.01 SOL = 10,000,000 lamports

        // Add participant to list if not already present
        let mut exists = false;
        for (i, p) in raffle_state.participants.iter_mut().enumerate() {
            if p.wallet == participant {
                p.tokens = p.tokens.checked_add(tokens).unwrap();
                exists = true;
                break;
            }
        }

        if !exists {
            raffle_state.participants.push(Participant {
                wallet: participant,
                tokens: tokens,
            });
            raffle_state.participant_count = raffle_state.participant_count.checked_add(1).unwrap();
        }

        // Check if threshold reached
        if raffle_state.total_sol >= 1_000_000_000_000 && !raffle_state.threshold_reached {
            raffle_state.threshold_reached = true;
        }

        Ok(())
    }

    pub fn select_winner(ctx: Context<SelectWinner>) -> Result<()> {
        let raffle_state = &mut ctx.accounts.raffle_state;

        // Check if threshold is reached
        if !raffle_state.threshold_reached {
            return Err(ErrorCode::ThresholdNotReached.into());
        }

        // Check if winner already selected
        if raffle_state.winner_selected {
            return Err(ErrorCode::WinnerAlreadySelected.into());
        }

        // Only admin can select the winner
        if ctx.accounts.admin.key() != raffle_state.admin {
            return Err(ErrorCode::Unauthorized.into());
        }

        // Get a "random" number based on recent blockhash and other variables
        let account_info = ctx.accounts.recent_slot_hash.to_account_info();
        let recent_blockhash = account_info.data.borrow();
        let blockhash_bytes = &recent_blockhash[..8];
        let timestamp = Clock::get()?.unix_timestamp;
        let timestamp_bytes = timestamp.to_le_bytes();

        // Combine data for hash
        let mut data_to_hash = vec![];
        data_to_hash.extend_from_slice(blockhash_bytes);
        data_to_hash.extend_from_slice(&timestamp_bytes);
        data_to_hash.extend_from_slice(&raffle_state.participant_count.to_le_bytes());

        let hash_result = hash(&data_to_hash);
        let random_value = u64::from_le_bytes(hash_result.to_bytes()[0..8].try_into().unwrap());

        // Create a weighted selection based on tokens
        let mut total_tokens: u64 = 0;
        for p in raffle_state.participants.iter() {
            total_tokens = total_tokens.checked_add(p.tokens).unwrap();
        }

        let winning_ticket = random_value % total_tokens;

        let mut ticket_counter: u64 = 0;
        let mut winner = Pubkey::default();

        for p in raffle_state.participants.iter() {
            ticket_counter = ticket_counter.checked_add(p.tokens).unwrap();
            if winning_ticket < ticket_counter {
                winner = p.wallet;
                break;
            }
        }

        // Update raffle state
        raffle_state.winner = winner;
        raffle_state.winner_selected = true;
        raffle_state.blacklist.push(winner);

        // Transfer 50% of the funds to the winner
        let winner_amount = raffle_state.total_sol / 2;

        let transfer_instruction = solana_program::system_instruction::transfer(
            &ctx.accounts.treasury.key(),
            &winner,
            winner_amount,
        );

        solana_program::program::invoke_signed(
            &transfer_instruction,
            &[
                ctx.accounts.treasury.to_account_info(),
                ctx.accounts.winner_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[b"treasury", &[ctx.bumps.treasury]]],
        )?;

        Ok(())
    }

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
        let raffle_state = &ctx.accounts.raffle_state;

        // Check if admin is authorized
        if ctx.accounts.admin.key() != raffle_state.admin
            && ctx.accounts.admin.key() != raffle_state.admin_auth_1
            && ctx.accounts.admin.key() != raffle_state.admin_auth_2
            && ctx.accounts.admin.key() != raffle_state.admin_auth_3
        {
            return Err(ErrorCode::Unauthorized.into());
        }

        // Get the treasury balance
        let treasury_balance = ctx.accounts.treasury.lamports();

        // Transfer funds to the designated payout wallet
        let transfer_instruction = solana_program::system_instruction::transfer(
            &ctx.accounts.treasury.key(),
            &raffle_state.payout_wallet,
            treasury_balance,
        );

        solana_program::program::invoke_signed(
            &transfer_instruction,
            &[
                ctx.accounts.treasury.to_account_info(),
                ctx.accounts.payout_wallet.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[b"treasury", &[ctx.bumps.treasury]]],
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin, space = 8 + 32 + 32 + 32 + 32 + 32 + 32 + 8 + 1 + 1 + 32 + 1024 + 8 + 1024)]
    pub raffle_state: Account<'info, RaffleState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut)]
    pub raffle_state: Account<'info, RaffleState>,

    #[account(mut)]
    pub participant: Signer<'info>,

    #[account(
        mut,
        seeds = [b"treasury"],
        bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SelectWinner<'info> {
    #[account(mut)]
    pub raffle_state: Account<'info, RaffleState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"treasury"],
        bump,
    )]
    /// CHECK: This is a PDA that will hold the treasury SOL
    pub treasury: UncheckedAccount<'info>,

    /// CHECK: This is the winner's account
    #[account(mut)]
    pub winner_account: UncheckedAccount<'info>,

    /// CHECK: This account provides recent slot hash for randomness
    pub recent_slot_hash: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut)]
    pub raffle_state: Account<'info, RaffleState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"treasury"],
        bump,
    )]
    /// CHECK: This is a PDA that will hold the treasury SOL
    pub treasury: UncheckedAccount<'info>,

    /// CHECK: This is the payout wallet account
    #[account(mut)]
    pub payout_wallet: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct RaffleState {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub admin_auth_1: Pubkey,
    pub admin_auth_2: Pubkey,
    pub admin_auth_3: Pubkey,
    pub payout_wallet: Pubkey,
    pub total_sol: u64,
    pub threshold_reached: bool,
    pub winner_selected: bool,
    pub winner: Pubkey,
    pub participants: Vec<Participant>,
    pub participant_count: u64,
    pub blacklist: Vec<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Participant {
    pub wallet: Pubkey,
    pub tokens: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Participant is blacklisted")]
    BlacklistedParticipant,
    #[msg("Threshold not reached")]
    ThresholdNotReached,
    #[msg("Winner already selected")]
    WinnerAlreadySelected,
    #[msg("Unauthorized access")]
    Unauthorized,
}
