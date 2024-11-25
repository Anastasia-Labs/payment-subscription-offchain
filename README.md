# Table of Contents

- [Aiken Upgradable Multisig Offchain](#aiken-upgradable-multisig-offchain)
  - [Introduction](#introduction)
  - [Documentation](#documentation)
  - [Usage Example](#usage-example)
    - [Setup](#setup-lucid--subscription-scripts)
    - [Create a Service](#create-a-service)
    - [Create a User Account](#create-a-user-account)
    - [Initiate a Subscription](#initiate-a-subscription)
    - [Unsubscribe](#unsubscribe)
    - [Merchant Withdraw Subscription Fees](#merchant-withdraw-subscription-fees)
  - [Local Build](#local-build)
  - [Test Framework](#test-framework)
  - [Running Tests](#running-tests)

<!-- TODO: Link to lucid-evolution -->
<!-- TODO: Clean up the examples with actual code -->
<!-- TODO: Make updated GIF for the tests -->
# Payment Subscription Offchain

## Introduction

The Payment Subscription Off-Chain SDK is a TypeScript library that conveniently interfaces with an Aiken-based Payment Subscription Smart Contract on the Cardano blockchain. It provides developers with an easy-to-use interface, enabling users to effortlessly manage recurring payments directly from their wallets. This SDK offers a decentralized and trustless solution for subscription-based services, leveraging the automation capabilities of smart contracts.

**Key features:**

- **Effortless Management of Recurring Payments:** Set up, manage, and cancel recurring payments seamlessly.

- **User-Controlled Subscriptions:** Users maintain control over their funds without the need for intermediaries..
- **Addition or Removal of Signers:** Update the list of signatories and threshold as needed.
- **Secure and Transparent:** Built on the Cardano blockchain, ensuring security and transparency.
- **Flexible Subscription Management:** Supports creation, updating, and cancellation of subscriptions.

This project is funded by the Cardano Treasury in [Catalyst Fund 11](https://projectcatalyst.io/funds/11/cardano-use-cases-product/anastasia-labs-x-maestro-plug-n-play-20)

## Documentation

### What is a Subscription Payments Smart Contract?

A Subscription Payments Smart Contract is a blockchain-based contract that automates recurring payments between users and service providers without intermediaries. It allows users to authorize scheduled payments directly from their wallets, enhancing security and control over their funds.

### How Does This Project Facilitate Multisig Transactions?

This project provides an off-chain SDK to interact along with our [Payment Subscription Smart Contract](https://github.com/Anastasia-Labs/payment-subscription). The contract enables:

- **Effortless Recurring Payments:** Automate subscription payments without intermediaries.

- **User-Controlled Subscriptions:** Users have full control over their subscriptions and funds.
- **Secure Transactions:** Leverages the security and transparency of the Cardano blockchain.
- **Flexible Subscription Management:** Supports creation, updating, and cancellation of subscriptions.


### Design Documentation

For a comprehensive understanding of the contract's architecture, design decisions, and implementation details, please refer to the [Payment Subscription Design Documentation](https://github.com/Anastasia-Labs/payment-subscription/blob/main/docs/payment-subscription-design-specs/subscription-smart-contract.pdf). This documentation provides in-depth insights into the contract's design, including its components, and detailed explanations of its functionality.

## Usage Example

### Install package

```sh
npm install @anastasia-labs/payment-subscription-offchain
```

or

```sh
pnpm install @anastasia-labs/payment-subscription-offchain
```

### Setup Lucid & Subscription Scripts

```ts

const lucid = await Lucid(
  new Maestro({
    network: "Preprod", // For MAINNET: "Mainnet"
    apiKey: "<Your-API-Key>", // Get yours by visiting https://docs.gomaestro.org/docs/Getting-started/Sign-up-login
    turboSubmit: false, // Read about paid turbo transaction submission feature at https://docs.gomaestro.org/docs/Dapp%20Platform/Turbo%20Transaction
  }),
  "Preprod" // For MAINNET: "Mainnet"
);

lucid.selectWallet.fromPrivateKey("your secret key here e.g. ed25519_...");

// Prepare the validator scripts
const serviceScript: SpendingValidator = {
  type: "PlutusV2",
  script: serviceValidator.compiledCode,
};

const accountScript: SpendingValidator = {
  type: "PlutusV2",
  script: accountValidator.compiledCode,
};

const paymentScript: SpendingValidator = {
  type: "PlutusV2",
  script: paymentValidator.compiledCode,
};

const subscriptionScripts = {
  service: serviceScript.script,
  account: accountScript.script,
  payment: paymentScript.script,
};
```

### Create a Service

```ts
import { createService, CreateServiceConfig } from "@anastasia-labs/payment-subscription-offchain";

// Define merchant address
const merchantAddress = "addr_test1...";

// Configure the service configuration
const serviceConfig: CreateServiceConfig = {
  service_fee: {
    currencySymbol: '', // For ADA, use empty string
    tokenName: '',      // For ADA, use empty string
  },
  service_fee_qty: 100_000_000n, // 100 ADA in lovelace
  penalty_fee: {
    currencySymbol: '', // For ADA, use empty string
    tokenName: '',      // For ADA, use empty string
  },
  penalty_fee_qty: 10_000_000n,  // 10 ADA in lovelace
  interval_length: 30n * 24n * 60n * 60n * 1000n, // 30 days in milliseconds
  num_intervals: 12n, // 12 intervals (e.g., months)
  minimum_ada: 2_000_000n, // Minimum ADA required
  is_active: true,
  scripts: {
    spending: subscriptionScripts.serviceScript.script,
    minting: '', // Minting script if applicable
    staking: '', // Staking script if applicable
  },
};

// Create the service
const createServiceTxUnsigned = await createService(lucid, serviceConfig);

if (createServiceTxUnsigned.type === "ok") {
  // Sign the transaction with the merchant's wallet
  const createServiceTxSigned = await createServiceTxUnsigned.data.sign().complete();
  const createServiceTxHash = await createServiceTxSigned.submit();
  console.log(`Service Created: ${createServiceTxHash}`);
} else {
  console.error("Failed to create service:", createServiceTxUnsigned.error);
}

```

### Create a User Account

```ts
import { createAccount, CreateAccountConfig } from "@anastasia-labs/payment-subscription-offchain";

// Define user address
const userAddress = "addr_test1...";

// Configure the account parameters
const accountConfig: CreateAccountConfig = {
  email: 'user@example.com',
  phone: '+1234567890',
  account_created: BigInt(Math.floor(Date.now() / 1000)), // Current UNIX timestamp
  scripts: {
    spending: subscriptionScripts.accountScript.script,
    minting: '', // Minting script if applicable
    staking: '', // Staking script if applicable
  },
// Create the user account
const createAccountTxUnsigned = await createAccount(lucid, accountConfig);

if (createAccountTxUnsigned.type === "ok") {
  // Sign the transaction with the user's wallet
  const createAccountTxSigned = await createAccountTxUnsigned.data.sign().complete();
  const createAccountTxHash = await createAccountTxSigned.submit();
  console.log(`Account Created: ${createAccountTxHash}`);
} else {
  console.error("Failed to create account:", createAccountTxUnsigned.error);
}

```
### Initiate a Subscription

```ts
import { initiateSubscription, InitiateSubscriptionConfig } from "@anastasia-labs/payment-subscription-offchain";

// Configure the subscription parameters
const subscriptionConfig: InitPaymentConfig = {
  service_nft_tn: 'SERVICE_NFT_TOKEN_NAME', // Replace with actual token name
  account_nft_tn: 'ACCOUNT_NFT_TOKEN_NAME', // Replace with actual token name
  subscription_fee: {
    currencySymbol: '', // For ADA, use empty string
    tokenName: '',      // For ADA, use empty string
  },
  total_subscription_fee: 1_200_000_000n, // Total for 12 months (1,200 ADA)
  subscription_start: BigInt(Math.floor(Date.now() / 1000)),
  subscription_end:
    BigInt(Math.floor(Date.now() / 1000)) + 12n * 30n * 24n * 60n * 60n, // 12 months later
  interval_length: 30n * 24n * 60n * 60n, // 30 days in seconds
  interval_amount: 100_000_000n, // 100 ADA per interval
  num_intervals: 12n,
  last_claimed: BigInt(Math.floor(Date.now() / 1000)),
  penalty_fee: {
    currencySymbol: '', // For ADA, use empty string
    tokenName: '',      // For ADA, use empty string
  },
  penalty_fee_qty: 10_000_000n, // 10 ADA
  minimum_ada: 2_000_000n,
  service_ref_token: 'SERVICE_REF_TOKEN', // Replace with actual unit
  account_user_token: 'ACCOUNT_USER_TOKEN', // Replace with actual unit
  scripts: {
    spending: subscriptionScripts.paymentScript.script,
    minting: '', // Minting script if applicable
    staking: '', // Staking script if applicable
  },
};

// Initiate the subscription
const initiateSubTxUnsigned = await initiateSubscription(lucid, subscriptionConfig);

if (initiateSubTxUnsigned.type === "ok") {
  // Sign the transaction with the user's wallet
  const initiateSubTxSigned = await initiateSubTxUnsigned.data.sign().complete();
  const initiateSubTxHash = await initiateSubTxSigned.submit();
  console.log(`Subscription Initiated: ${initiateSubTxHash}`);
} else {
  console.error("Failed to initiate subscription:", initiateSubTxUnsigned.error);
}

```

### Unsubscribe

```ts
import { unsubscribe, UnsubscribeConfig } from "@anastasia-labs/payment-subscription-offchain";

// Configure the unsubscription parameters
const unsubscribeConfig: UnsubscribeConfig = {
  service_nft_tn: 'SERVICE_NFT_TOKEN_NAME', // Replace with actual token name
  account_nft_tn: 'ACCOUNT_NFT_TOKEN_NAME', // Replace with actual token name
  currentTime: BigInt(Math.floor(Date.now() / 1000)),
  user_token: 'USER_TOKEN_UNIT', // Replace with actual unit
  ref_token: 'REF_TOKEN_UNIT', // Replace with actual unit
  payment_policy_Id: 'PAYMENT_POLICY_ID', // Replace with actual policy ID
  payment_scripts: {
    spending: subscriptionScripts.paymentScript.script,
    minting: '', // Minting script if applicable
    staking: '', // Staking script if applicable
  },
};

// Unsubscribe from the service
const unsubscribeTxUnsigned = await unsubscribe(lucid, unsubscribeConfig);

if (unsubscribeTxUnsigned.type === "ok") {
  // Sign the transaction with the user's wallet
  const unsubscribeTxSigned = await unsubscribeTxUnsigned.data.sign().complete();
  const unsubscribeTxHash = await unsubscribeTxSigned.submit();
  console.log(`Unsubscribed Successfully: ${unsubscribeTxHash}`);
} else {
  console.error("Failed to unsubscribe:", unsubscribeTxUnsigned.error);
}
```

### Merchant Withdraw Subscription Fees

```ts
import { withdrawFees, WithdrawFeesConfig } from "@anastasia-labs/payment-subscription-offchain";

// Configure the withdrawal parameters
const withdrawConfig: MerchantWithdrawConfig = {
  last_claimed: previousClaimTimestamp, // As bigint
  payment_policy_Id: 'PAYMENT_POLICY_ID', // Replace with actual policy ID
  merchant_token: 'MERCHANT_TOKEN_UNIT', // Replace with actual unit
  service_ref_token: 'SERVICE_REF_TOKEN', // Replace with actual unit
  serviceUTxOs: [], // Provide list of UTxOs if necessary
  scripts: {
    spending: subscriptionScripts.paymentScript.script,
    minting: '', // Minting script if applicable
    staking: '', // Staking script if applicable
  },
};


// Withdraw subscription fees
const withdrawTxUnsigned = await withdrawFees(lucid, withdrawConfig);

if (withdrawTxUnsigned.type === "ok") {
  // Sign the transaction with the merchant's wallet
  const withdrawTxSigned = await withdrawTxUnsigned.data.sign().complete();
  const withdrawTxHash = await withdrawTxSigned.submit();
  console.log(`Fees Withdrawn: ${withdrawTxHash}`);
} else {
  console.error("Failed to withdraw fees:", withdrawTxUnsigned.error);
}

```

## Local Build

In the main directory

```
pnpm run build
```

## Test framework

https://github.com/vitest-dev/vitest

## Running Tests

```sh
pnpm test
```

![payment-subscription-offchain](/docs/images/offchain_sdk_tests.gif)

Test results:

![alt text](/docs/images/offchain_tests.png)

Each test case is designed to validate specific aspects of the multi-signature contract,To run only specific tests, do:

```sh
pnpm test test/test-case-function-name.test.ts
```

