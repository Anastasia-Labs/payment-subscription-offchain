# Aiken Multisig Offchain – Examples

This folder contains **practical** examples and a command-line interface (CLI) to demonstrate how to use the Aiken Multisig Offchain SDK on the **Preprod** network. These examples walk you through:

1. **Initializing a Multisig Contract** (locking funds).
2. **Signing** a transaction with multiple signers.
3. **Updating** the contract (adjust signers, threshold, or spending limit).
4. **Ending** the contract (releasing funds).

---

## Contents

- **`cli.ts`**: A CLI entry point using Commander.  
- **`init_multi_sig.ts`**: Demonstrates how to initiate a multisig contract.  
- **`validate_sign.ts`**: Shows how to sign a transaction.  
- **`validate_update.ts`**: Shows how to update signers, thresholds, or spending limits.  
- **`end_multisig.ts`**: Closes the contract, releasing locked funds.

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
    INITIATOR_SEED="seed words..."
    SIGNER_ONE_SEED="seed words..."
    SIGNER_TWO_SEED="seed words..."
    SIGNER_THREE_SEED="seed words..."

    ```
Ensure you have correct credentials for Preprod.

## Running the CLI

You can use the CLI subcommand approach, For example, we you have a subcommand named multisig:

- Initialize a new contract.

    ```bash
    pnpm start multisig init
    ```
- Sign a transaction.

    ```bash
    pnpm start multisig sign
    ```

- Update a contract.

    ```bash
    pnpm start multisig update
    ```

- End a multisig contract.

    ```bash
    pnpm start multisig end
    ```

