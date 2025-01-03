# Payment Subscription Offchain – Examples

This folder contains **practical** examples and a command-line interface (CLI) to demonstrate how to use the Payment Subscription Offchain SDK on the **Preprod** network. These examples walk you through:

1. **Create a Service**. Mint a Service reference NFT and merchant NFT.
2. **Update a Service**. Update the relevant datum fields.
3. **Removing a Service**. Switching the isActive field in the datum to false..
4. **Create an Account**. Mint an Account reference NFT and subscriber NFT.
5. **Update an Account**. Update the relevant datum fields.
5. **Remove an Account**. Burn the reference and user NFT

---

## Contents

- **`cli.ts`**: A CLI entry point using Commander.  
- **`create_account.ts`**: Demonstrates how to create a subscriber account.  
- **`update_account.ts`**: Shows how to update account details.  
- **`remove_account.ts`**: Shows how to remove a subscriber from the system.
- **`create_service.ts`**: Shows a merchant creates a subscription service.
- **`update_service.ts`**: Shows how a merchant updates a subscription service.
- **`remove_service.ts`**: Shows how to make a subscription service dormant.
- **`init_subscription.ts`**: Shows how a subscriber creates a subscription by locking funds.

You can adapt these scripts to your own workflow or environment.

---

## Setup

1. **Install Dependencies** (in the `examples` folder):
   ```bash
   pnpm install
   ```
1. Build
    ```bash
    pnpm run build
    ```
1. Configure Environment (create a .env or export variables):
    ```bash
    API_KEY=<Maestro API Key>
    SUBSCRIBER_WALLET_SEED="seed words..."
    MERCHANT_WALLET_SEED="seed words..."
    ```
Ensure you have correct credentials for Preprod.

## Running the CLI

You can use the CLI subcommand approach, For example, we you have a subcommand named multisig:

Execute a new transaction with the contract keyword for instance.
- Service

    ```bash
    pnpm start service create
    pnpm start service update
    pnpm start service remove
    ```
- Account

    ```bash
    pnpm start account create
    pnpm start account update
    pnpm start account remove    ```

- Payment

    ```bash
    pnpm start payment init
    pnpm start payment extend
    pnpm start payment merchant_withdraw
    pnpm start payment unsubscribe
    pnpm start payment withdraw_penalty
    pnpm start payment subscriber_withdraw
    ```
