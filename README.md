# Table of Contents

- [Aiken Upgradable Multisig Offchain](#aiken-upgradable-multisig-offchain)
  - [Introduction](#introduction)
  - [Documentation](#documentation)
  - [Usage Example](#usage-example)
    - [Setup](#setup-lucid--multisig-scripts)
    - [Initiate Multisig Contract](#initiate-multisig-contract)
    - [Sign](#sign)
    - [Update Multisig Contract](#update-multisig-contract)
    - [Adjust Signer Threshold](#adjust-signer-threshold)
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
    import Script from "../src/validator/multisig_validator.json" assert { type: "json" };

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

// Configure the service parameters
const serviceConfig: CreateServiceConfig = {
  merchantPkh: getAddressDetails(merchantAddress).paymentCredential?.hash!,
  serviceName: "Premium Content Access",
  subscriptionFee: 1_000_000n, // 1 ADA in lovelace
  subscriptionPeriod: 30, // Subscription period in days
  scripts: subscriptionScripts,
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
  userPkh: getAddressDetails(userAddress).paymentCredential?.hash!,
  scripts: subscriptionScripts,
};

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
const subscriptionConfig: InitiateSubscriptionConfig = {
  userPkh: getAddressDetails(userAddress).paymentCredential?.hash!,
  merchantPkh: getAddressDetails(merchantAddress).paymentCredential?.hash!,
  serviceId: "service_nft_token_name", // The identifier of the service NFT
  subscriptionFee: 1_000_000n, // Amount per period in lovelace (e.g., 1 ADA)
  subscriptionPeriod: 30, // Subscription period in days
  startDate: new Date(), // Subscription start date
  scripts: subscriptionScripts,
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
  subscriptionId: subscriptionId,
  userPkh: getAddressDetails(userAddress).paymentCredential?.hash!,
  scripts: subscriptionScripts,
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
const withdrawConfig: WithdrawFeesConfig = {
  merchantPkh: getAddressDetails(merchantAddress).paymentCredential?.hash!,
  subscriptionId: subscriptionId,
  scripts: subscriptionScripts,
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

#### Removing a Signer:

```ts
// Remove a signer (e.g., signer2)
const updatedSigners = [initiatorPkh, signer1Pkh];

// Update the signers list and threshold
const removeSignerConfig: UpdateValidateConfig = {
  newSigners: updatedSigners,
  newThreshold: 2n,
  funds: {
    policyId: "",
    assetName: "",
  },
  newSpendingLimit: 10_000_000n,
  minimumAda: 2_000_000n,
  scripts: multisigScripts,
};

// Proceed with validation and signing as shown in the update example

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

