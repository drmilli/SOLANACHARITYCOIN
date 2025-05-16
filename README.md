# Welcome!

This is the official repository for organizations and charities to create random 50/50 raffle lotteries on the Solana Blockchain.

# How it works:

## Roles

1. As the account treasurer, you and 3 other accounts are admin and permissioned to access and withdraw the funds of the account after a random verifiable winner is announced on the raffle information page.
2. As the participant or donator, you select a raffle in which you would like to participate in, and donate the funds.

## Contract

1. The contract is initiated through `anchor deploy` - This needs a unique program ID to be viably deployed into the Solana blockchain.
2. The program receives all donations, and is programmable and changable to an admins wallet.
3. The program hosts specific state conditions and error handling to prevent incorrect payments and decisions to be made.
4. The frontend is the UI that helps ease the convenience of deployment, announcements, winner, and retrieval of funds but this can be used on any Solana IDE (Such as https://beta.solpg.io, by importing the code and program ID)

## Frontend

## Common Bugs:
1. As a demo/tester you will likely get several Hydration UI errors. We have found that once you handle the essential operations (Creating the raffle, donating to a raffle, or announcing a winner), it is useful to head back to the home index and then change the wallet from there to the permissioned account before then accessing another section of the site.
2. Some information may be static, but it is easy to implement and read the RPC indexing information from the public solana API (Read: https://solana.com/docs/rpc)
3. On live production, very rarely do some users not get selected, but if this happens, it is in your best ethical and legal interest to retrieve the arrayed list from the program and then use a transparent means of announcing the winner.
4. The treasury is currently enabled to retrieve all funds without announcing a winner, on live production - users should be aware of this issue and only consent to verified and audited program deployments.


# Contacts

| Name            | Email                                    |
| :-------------- | :--------------------------------------- |
| Frank Dierolf   | frank_dierolf@web.de                     |
| Judith Williams | j.williams@theblackhistoryfoundation.org |
| Trevor Parks    | cyphercryptoconsulting@gmail.com         |
| Watson Rodriguez    | watson@arthurlabs.net         |
