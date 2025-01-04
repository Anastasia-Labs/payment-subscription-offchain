# Table of Contents

- [Payment Subscription Offchain](#payment-subscription-offchain)
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

<!-- TODO: Clean up the examples with actual code -->
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

### How Does This Project Facilitate Payment Subscription Transactions?

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

Below are the basic instructions on how to use the Payment Subscription endpoints.

For a more comprehensive working example, checkout the [examples folder](https://github.com/Anastasia-Labs/payment-subscription-offchain/tree/main/examples)..

### Setup Lucid & Subscription Scripts

```ts
import { Lucid, Maestro } from "@lucid-evolution/lucid";

const lucid = await Lucid(
  new Maestro({
    network: "Preprod", // For MAINNET: "Mainnet"
    apiKey: "<Your-API-Key>", // Get yours by visiting https://docs.gomaestro.org/docs/Getting-started/Sign-up-login
    turboSubmit: false, // Read about paid turbo transaction submission feature at https://docs.gomaestro.org/docs/Dapp%20Platform/Turbo%20Transaction
  }),
  "Preprod" // For MAINNET: "Mainnet"
);

```

### Create a Service

```ts
import {  createService, CreateServiceConfig, LucidEvolution, } from "@anastasia-labs/payment-subscription-offchain";

// Configure the service configuration
const serviceConfig: CreateServiceConfig = {
  service_fee: {
    policyId: '', // For ADA, use empty string
    assetName: '',      // For ADA, use empty string
  },
  service_fee_qty: 100_000_000n, // 100 ADA in lovelace
  penalty_fee: {
    policyId: '', // For ADA, use empty string
    assetName: '',      // For ADA, use empty string
  },
  penalty_fee_qty: 10_000_000n,  // 10 ADA in lovelace
  interval_length: 30n * 24n * 60n * 60n * 1000n, // 30 days in milliseconds
  num_intervals: 12n, // 12 intervals (e.g., months)
  minimum_ada: 2_000_000n, // Minimum ADA required
  is_active: true,
};

// Create the service
  try {
        lucid.selectWallet.fromSeed(MERCHANT_WALLET_SEED);
        const createServiceUnSigned = await createService(lucid, serviceConfig);
        const initTxSigned = await createServiceUnSigned.sign.withWallet()
            .complete();
        const initTxHash = await initTxSigned.submit();

        console.log(`Service created successfully: ${initTxHash}`);
    } catch (error) {
        console.error("Failed to create service:", error);
    }
```

### Update a Service

```ts
import {  updateService, UpdateServiceConfig, LucidEvolution, } from "@anastasia-labs/payment-subscription-offchain";

// Configure the service configuration
  const serviceUTxOs = await lucid.utxosAt(serviceAddress);

    // Get utxos where is_active in datum is set to true
    const activeServiceUTxOs = serviceUTxOs.filter((utxo) => {
        if (!utxo.datum) return false;
        const datum = Data.from<ServiceDatum>(utxo.datum, ServiceDatum);
        return datum.is_active === true;
    });

    const serviceData = await getServiceValidatorDatum(activeServiceUTxOs);

    const updateServiceConfig: UpdateServiceConfig = {
        new_service_fee: serviceData[0].service_fee,
        new_service_fee_qty: 9_500_000n,
        new_penalty_fee: serviceData[0].penalty_fee,
        new_penalty_fee_qty: 1_000_000n,
        new_interval_length: 1n,
        new_num_intervals: 12n,
        new_minimum_ada: 2_000_000n,
        is_active: serviceData[0].is_active,
    };

// Create the service
  try {
        lucid.selectWallet.fromSeed(MERCHANT_WALLET_SEED);
        const updateServiceUnsigned = await updateService(
            lucid,
            updateServiceConfig,
        );
        const updateTxSigned = await updateServiceUnsigned.sign.withWallet()
            .complete();
        const initTxHash = await updateTxSigned.submit();

        console.log(`Service updated successfully: ${initTxHash}`);
    } catch (error) {
        console.error("Failed to update service:", error);
    }
```

### Remove a Service

```ts
import {  removeService, LucidEvolution, } from "@anastasia-labs/payment-subscription-offchain";

// Remove Service
try {
    const removeServiceUnsigned = await removeService(
        lucid,
    );
    const removeServiceSigned = await removeServiceUnsigned.sign
        .withWallet()
        .complete();
    const removeServiceHash = await removeServiceSigned.submit();

    console.log(
        `Service removed successfully || change isActive to false: ${removeServiceHash}`,
    );
} catch (error) {
    console.error("Failed to remove Service:", error);
}
```

### Create a User Account

```ts
import { createAccount, CreateAccountConfig } from "@anastasia-labs/payment-subscription-offchain";

// Configure the account parameters
const accountConfig: CreateAccountConfig = {
  email: 'user@example.com',
  phone: '+1234567890',
  account_created: BigInt(Math.floor(Date.now() / 1000)), // Current UNIX timestamp
}
  // Create the user account
   try {
        const createAccountUnsigned = await createAccount(lucid, accountConfig);
        const createAccountSigned = await createAccountUnsigned.sign
            .withWallet()
            .complete();
        const createAccountHash = await createAccountSigned.submit();

        console.log(`Account created successfully: ${createAccountHash}`);
    } catch (error) {
        console.error("Failed to create Account:", error);
    }

```

### Update an Account

```ts
import { updateAccount, UpdateAccountConfig } from "@anastasia-labs/payment-subscription-offchain";

// Configure the account parameters
const accountConfig: UpdateAccountConfig = {
  new_email: 'user@example.com',
  new_phone: '+1234567890',
  account_nft_tn: accountNftTn,
  subscriber_nft_tn: subscriberNftTn,
}
  // Update Service
  try {
      const updateServiceUnsigned = await updateAccount(
          lucid,
          updateAccountConfig,
      );
      const updateAccountSigned = await updateServiceUnsigned.sign
          .withWallet()
          .complete();
      const updateAccountHash = await updateAccountSigned.submit();

      console.log(`Account updated successfully: ${updateAccountHash}`);
  } catch (error) {
      console.error("Failed to update Account:", error);
  }

```

### Remove an Account

```ts
import { removeAccount } from "@anastasia-labs/payment-subscription-offchain";

// Remove Account
try {
    const removeAccountUnsigned = await removeAccount(
        lucid,
    );
    const removeAccountSigned = await removeAccountUnsigned.sign
        .withWallet()
        .complete();
    const removeAccountHash = await removeAccountSigned.submit();

    console.log(`Account removed successfully: ${removeAccountHash}`);
} catch (error) {
    console.error("Failed to remove Account:", error);
}

```

### Initiate a Subscription

```ts
import { initiateSubscription, InitPaymentConfig } from "@anastasia-labs/payment-subscription-offchain";

// Configure the subscription parameters
const subscriptionConfig: InitPaymentConfig = {
  service_nft_tn: 'SERVICE_NFT_TOKEN_NAME', // Replace with actual token name
  account_nft_tn: 'ACCOUNT_NFT_TOKEN_NAME', // Replace with actual token name
  subscription_fee: {
    policyId: '', // For ADA, use empty string
    assetName: '',      // For ADA, use empty string
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
    policyId: '', // For ADA, use empty string
    assetName: '',      // For ADA, use empty string
  },
  penalty_fee_qty: 10_000_000n, // 10 ADA
  minimum_ada: 2_000_000n,
};

// Initiate the subscription
const initiateSubTxUnsigned = await initiateSubscription(lucid, subscriptionConfig);

try {
      const initSubscriptionUnsigned = await initiateSubscription(
          lucid,
          paymentConfig,
      );
      const initSubscriptionSigned = await initSubscriptionUnsigned.sign
          .withWallet()
          .complete();
      const initSubscriptionHash = await initSubscriptionSigned.submit();

      console.log(
          `Subscription initiated successfully: ${initSubscriptionHash}`,
      );
  } catch (error) {
      console.error("Failed to initiate subscription:", error);
  }

```

### Extend a Subscription

```ts
import { 
  accountPolicyId,
  ExtendPaymentConfig,
  extendSubscription,
  findCip68TokenNames,
  LucidEvolution, 
} from "@anastasia-labs/payment-subscription-offchain";

const accountUTxOs = await lucid.utxosAt(accountAddress);
const subscriberUTxOs = await lucid.utxosAt(subscriberAddress);

const { refTokenName: accountNftTn, userTokenName: subscriberNftTn } =
    findCip68TokenNames(
        [accountUTxOs[0], subscriberUTxOs[0]],
        accountPolicyId,
    );

const extendPaymentConfig: ExtendPaymentConfig = {
    subscriber_nft_tn: subscriberNftTn,
};

// Extend Subscription
try {
    const extendUnsigned = await extendSubscription(
        lucid,
        extendPaymentConfig,
    );
    const extendSigned = await extendUnsigned.sign
        .withWallet()
        .complete();
    const extendTxHash = await extendSigned.submit();

    console.log(`Service extended successfully: ${extendTxHash}`);
} catch (error) {
    console.error("Failed to extend service:", error);
}

```

### Unsubscribe

```ts
import { 
  accountPolicyId,
  findCip68TokenNames,
  LucidEvolution,
  servicePolicyId,
  unsubscribe,
  UnsubscribeConfig, 
} from "@anastasia-labs/payment-subscription-offchain";

// Configure the unsubscription parameters
const unsubscribeConfig: UnsubscribeConfig = {
  service_nft_tn: 'SERVICE_NFT_TOKEN_NAME', // Replace with actual token name
  subscriber_nft_tn: 'SUMSCRIBER_NFT_TOKEN_NAME', // Replace with actual token name
  current_time: BigInt(Math.floor(Date.now() / 1000)),
};

// Unsubscribe from the service
try {
      const initSubscriptionUnsigned = await unsubscribe(
          lucid,
          unsubscribeConfig,
      );
      const initSubscriptionSigned = await initSubscriptionUnsigned.sign
          .withWallet()
          .complete();
      const initSubscriptionHash = await initSubscriptionSigned.submit();

      console.log(
          `Unsubscribed successfully: ${initSubscriptionHash}`,
      );
  } catch (error) {
      console.error("Failed to unsubscribe:", error);
  }
```

### Merchant Withdraw Subscription Fees

```ts
import {  
  findCip68TokenNames,
  LucidEvolution,
  merchantWithdraw,
  MerchantWithdrawConfig,
  servicePolicyId,
} from "@anastasia-labs/payment-subscription-offchain";

// Configure the withdrawal parameters
const withdrawConfig: MerchantWithdrawConfig = {
  service_ref_token: 'SERVICE_REF_TOKEN', // Replace with actual unit
  merchant_token: 'MERCHANT_TOKEN_UNIT', // Replace with actual unit
  last_claimed: previousClaimTimestamp, // As bigint
};

// Withdraw subscription fees
try {
      const merchantWithdrawUnsigned = await merchantWithdraw(
          lucid,
          merchantWithdrawConfig,
      );
      const merchantWithdrawSigned = await merchantWithdrawUnsigned.sign
          .withWallet()
          .complete();
      const merchantWithdrawTxHash = await merchantWithdrawSigned.submit();

      console.log(`Merchant Withdraw Successful: ${merchantWithdrawTxHash}`);
  } catch (error) {
      console.error("Failed to withdraw by Merchant:", error);
  }

```

### Merchant Withdraw Penalty Fees

```ts
import {  
  findCip68TokenNames,
  LucidEvolution,
  merchantPenaltyWithdraw,
  servicePolicyId,
  WithdrawPenaltyConfig, 
} from "@anastasia-labs/payment-subscription-offchain";

const serviceUTxOs = await lucid.utxosAt(serviceAddress);
const merchantUTxOs = await lucid.utxosAt(merchantAddress);

const { refTokenName: serviceNftTn, userTokenName: merchantNftTn } =
    findCip68TokenNames(
        [serviceUTxOs[0], merchantUTxOs[0]],
        servicePolicyId,
    );

const withdrawPenaltyConfig: WithdrawPenaltyConfig = {
    service_nft_tn: serviceNftTn,
    merchant_nft_tn: merchantNftTn,
    merchant_utxos: merchantUTxOs,
    service_utxos: serviceUTxOs,
};

// Merchant Withdraw
try {
    const penaltyWithdrawUnsigned = await merchantPenaltyWithdraw(
        lucid,
        withdrawPenaltyConfig,
    );
    const penaltyWithdrawSigned = await penaltyWithdrawUnsigned.sign
        .withWallet()
        .complete();
    const penaltyWithdrawTxHash = await penaltyWithdrawSigned.submit();

    console.log(`Service created successfully: ${penaltyWithdrawTxHash}`);
} catch (error) {
    console.error("Failed to create service:", error);
}

```


### Subscriber Withdraw

```ts
import { 
  accountPolicyId,
  Data,
  findCip68TokenNames,
  LucidEvolution,
  ServiceDatum,
  servicePolicyId,
  subscriberWithdraw,
  SubscriberWithdrawConfig
} from "@anastasia-labs/payment-subscription-offchain";

 const serviceUTxOs = await lucid.utxosAt(serviceAddress);
    const merchantUTxOs = await lucid.utxosAt(merchantAddress);
    const accountUTxOs = await lucid.utxosAt(accountAddress);
    const subscriberUTxOs = await lucid.utxosAt(subscriberAddress);

    const { refTokenName: serviceNftTn, userTokenName: merchantNftTn } =
        findCip68TokenNames(
            [serviceUTxOs[0], merchantUTxOs[0]],
            servicePolicyId,
        );

    const { refTokenName: accountNftTn, userTokenName: subscriberNftTn } =
        findCip68TokenNames(
            [accountUTxOs[0], subscriberUTxOs[0]],
            accountPolicyId,
        );

    // Get utxos where is_active in datum is set to true
    const inActiveServiceUTxOs = serviceUTxOs.filter((utxo) => {
        if (!utxo.datum) return false;

        const datum = Data.from<ServiceDatum>(utxo.datum, ServiceDatum);

        return datum.is_active === false;
    });

    const subscriberWithdrawConfig: SubscriberWithdrawConfig = {
        service_nft_tn: serviceNftTn,
        subscriber_nft_tn: subscriberNftTn,
        service_utxos: inActiveServiceUTxOs,
    };

    // Merchant Withdraw
    try {
        const merchantWithdrawUnsigned = await subscriberWithdraw(
            lucid,
            subscriberWithdrawConfig,
        );
        const merchantWithdrawSigned = await merchantWithdrawUnsigned.sign
            .withWallet()
            .complete();
        const merchantWithdrawTxHash = await merchantWithdrawSigned.submit();

        console.log(`Service created successfully: ${merchantWithdrawTxHash}`);
    } catch (error) {
        console.error("Failed to create service:", error);
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

Each test case is designed to validate specific aspects of the payment subscription contract,To run only specific tests, do:

```sh
pnpm test test/test-case-function-name.test.ts
```

