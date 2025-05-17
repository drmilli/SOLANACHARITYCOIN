<div align="center">
<img src="https://i.ibb.co/cDcMQs9/Frame-3649.png" alt="logo" width="120" height="120" />
</div>

<h3 align="center">LOCALE</h3>
  <p align="center">
  <br />
    <a href="https://drive.google.com/file/d/1cQzj4q9q7yn0LPZ4G287Bjo_bN-n7KkM/view?usp=sharing">Youtube</a>
    ·
    <a href="https://drive.google.com/file/d/1Lt-Ocd0fLM6UAZ5BbDNExJSKPsVkLkG4/view?usp=sharing">Long Video</a>
    ·
    <a href="https://github.com/5eh/LOCALE">Repo</a>
  </p>
</div>

### About the hack

<details>
  <summary>INTRO</summary>
  We're the team at The Black History Foundation, with a group of wonderful volunteers and advocates interested in building a permanent ledger of black ancestrial history. Our hackathon submission was a completely random and veriably transparent 50/50 raffle mechanism to help legally operating charities and DAOs raise funds.

  Our hackathon submission includes a nicely designed website, program ID reference, and interactive functions inside of Solanas ecosystem, with blockchain transactions to verify the hackathon efforts.
</details>

<details>
<summary>PROBLEM</summary>
There are two major problems that charities face:
1. Inprobablistic and abusive tendencies inside of 50/50 raffles.
2. There is no clear transparency or reputable gaining mechanisms that help verify the Charities authenticity.
</details>

<details>
<summary>SOLUTION</summary>
The solutions that we came up with to solve these problems:
1. Verifiably random lottery winners on public ledgers with public account values of the treasury to see real results.
2. Real charities can implement this program to enable an authentic and marketable service that helps both raise funds, and distribute winnings to their supportive donators.
</details>

<details>
<summary>CONTRACT DEPLOYMENT</summary>
1. The contract is initiated through `anchor deploy` - This needs a unique program ID to be viably deployed into the Solana blockchain.
2. The program receives all donations, and is programmable and changable to an admins wallet.
3. The program hosts specific state conditions and error handling to prevent incorrect payments and decisions to be made.
4. The frontend is the UI that helps ease the convenience of deployment, announcements, winner, and retrieval of funds but this can be used on any Solana IDE (Such as https://beta.solpg.io, by importing the code and program ID)
</details>


<details>
<summary>CODE PROBLEMS</summary>
1. As a demo/tester you will likely get several Hydration UI errors. We have found that once you handle the essential operations (Creating the raffle, donating to a raffle, or announcing a winner), it is useful to head back to the home index and then change the wallet from there to the permissioned account before then accessing another section of the site.
2. Some information may be static, but it is easy to implement and read the RPC indexing information from the public solana API (Read: https://solana.com/docs/rpc)
3. On live production, very rarely do some users not get selected, but if this happens, it is in your best ethical and legal interest to retrieve the arrayed list from the program and then use a transparent means of announcing the winner.
4. The treasury is currently enabled to retrieve all funds without announcing a winner, on live production - users should be aware of this issue and only consent to verified and audited program deployments.
</details>

<details>
<summary>USER ROLES</summary>
1. As the account treasurer, you and 3 other accounts are admin and permissioned to access and withdraw the funds of the account after a random verifiable winner is announced on the raffle information page.
2. As the participant or donator, you select a raffle in which you would like to participate in, and donate the funds.
</details>



### Quick start

1.  `https://github.com/BlackHistoryDAO/SOLANACHARITYCOIN`
2.  `pnpm install`
3.  OPEN [Playground](https://beta.solpg.io/) && Copy `raffle/programs/raffle/src/lib.rs` && Copy + paste into a new program environment
4.  CREATE a new Program ID and deploy into Devnet or Testnet `IDL`
5.  PASTE new `IDL` into `raffle/target/idl/raffle.json`
6. PASTE new program ID into `raffle/programs/raffle/src/lib.rs`
7.  UPDATE frontend code stack to refer to new `PROGRAM_ID`
8.  `pnpm dev`
9. `pnpm build` - After changing frontend experience to fit the needs of your charities!

### Deep dive

Check the READMEs in the individual package folders

[Configure a new marketplace!](https://github.com/5eh/Arthur-Labs-Polkadot-Prodigy/tree/main/frontend/src/marketplaceVariables)

[Smart contracts](https://github.com/5eh/Arthur-Labs-Polkadot-Prodigy/blob/main/contracts/readme.md)

### Contact

| Name            | Email                                    |
| :-------------- | :--------------------------------------- |
| Frank Dierolf   | frank_dierolf@web.de                     |
| Judith Williams | j.williams@theblackhistoryfoundation.org |
| Trevor Parks    | cyphercryptoconsulting@gmail.com         |
| Watson Rodriguez    | watson@arthurlabs.net         |
