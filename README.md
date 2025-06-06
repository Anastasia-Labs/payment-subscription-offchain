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
    apiKey: "<Your-API-Key>", // Get yours by visiting https://docs.gomaestro.org/getting-started
    turboSubmit: false, // Read about paid turbo transaction submission feature at https://docs.gomaestro.org/cardano/turbo-submit-transaction
  }),
  "Preprod" // For MAINNET: "Mainnet"
);

```

**Get Your [Maestro API Key](https://docs.gomaestro.org/getting-started)**

## Service Endpoints

### Create a Service

This endpoint is initiated by a Merchant with the 
- service fee: How much a Subscriber should pay for the service
- penalty fee: (Opional), How much the Merchant wants to charge at the event a Subscriber unsubscribes before their initial number of intervals set when subscribing.
- Interval length: The number of intervals such as one month.
- Number of intervals: The intervals the subscription fee covers.

```ts
import { ADA, createService, CreateServiceConfig, LucidEvolution, } from "@anastasia-labs/payment-subscription-offchain";

 try {
        const utxos = await lucid.wallet().getUtxos()
      // Configure the service configuration
  const serviceConfig: CreateServiceConfig = {
            selected_out_ref: utxos[0],
            service_fee_policyid: ADA.policyId,
            service_fee_assetname: ADA.assetName,
            service_fee: 10_000_000n,
            penalty_fee_policyid: ADA.policyId,
            penalty_fee_assetname: ADA.assetName,
            penalty_fee: 1_000_000n,
            interval_length: 30n * 24n * 60n * 60n * 1000n, // 30 days
            num_intervals: 12n,
            is_active: true,
        };

        console.log("Creating service with config:", serviceConfig);

        const createServiceUnSigned = await createService(lucid, serviceConfig);
        const createServiceTxSigned = await createServiceUnSigned.sign
            .withWallet()
            .complete();
        const createServiceTxHash = await createServiceTxSigned.submit();

        console.log(`Submitting ...`);
        await lucid.awaitTx(createServiceTxHash);

        console.log(`Service created successfully: ${createServiceTxHash}`);
    } catch (error) {
        console.error("Failed to create service:", error);
    }
```

### Update a Service

Also initiated by the Merchant. This endpoint allows the Merchant to make changes to their initial configurations.

```ts
import {
    LucidEvolution,
    updateService,
    UpdateServiceConfig,
} from "@anastasia-labs/payment-subscription-offchain";

    const updateServiceConfig: UpdateServiceConfig = {
        service_nft_tn: 'SERVICE_NFT_TOKEN_NAME', // Replace with actual token name
        merchant_nft_tn: 'MERCHANT_TOKEN_UNIT', // Replace with actual unit
        new_service_fee: 9_500_000n,
        new_penalty_fee: 1_000_000n,
        new_interval_length: 10n * 24n * 60n * 60n * 1000n,
        new_num_intervals: 10n,
    };

    // Update Service
    try {
        const updateServiceUnsigned = await updateService(
            lucid,
            updateServiceConfig,
        );
        const updateTxSigned = await updateServiceUnsigned.sign.withWallet()
            .complete();
        const updateTxHash = await updateTxSigned.submit();

        console.log(`Service updated successfully: ${updateTxHash}`);
    } catch (error) {
        console.error("Failed to update service:", error);
    }

```

### Remove a Service

Can only be initated by the Merchant.

Rather than removing the service, this endpoint allows the Merchant to deactivate the Service by setting the isActive field to false.

```ts
import {
    LucidEvolution,
    removeService,
    RemoveServiceConfig,
} from "@anastasia-labs/payment-subscription-offchain";

    const removeServiceConfig: RemoveServiceConfig = {
        service_nft_tn: 'SERVICE_NFT_TOKEN_NAME', // Replace with actual token name
        merchant_nft_tn: 'MERCHANT_TOKEN_UNIT', // Replace with actual unit
    };

    // Remove Service
    try {
        const removeServiceUnsigned = await removeService(
            lucid,
            removeServiceConfig,
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
## Account Endpoints

These endpoints are all initiated by the Subscriber.

### Create a User Account

The Subscriber creates an Account by setting an email and Phone number.


```ts
import { createAccount, CreateAccountConfig } from "@anastasia-labs/payment-subscription-offchain";

  try {
        const utxos = await lucid.wallet().getUtxos()
        const accountConfig: CreateAccountConfig = {
            selected_out_ref: utxos[0],
            email: bytesToHex(sha256("business@web3.ada")),
            phone: bytesToHex(sha256("288-481-2686")),
        };

        const createAccountUnsigned = await createAccount(lucid, accountConfig);
        const createAccountSigned = await createAccountUnsigned.sign
            .withWallet()
            .complete();
        const createAccountHash = await createAccountSigned.submit();
        console.log(`Submitting ...`);
        await lucid.awaitTx(createAccountHash);

        console.log(`Account created successfully: ${createAccountHash}`);
    } catch (error) {
        console.error("Failed to create Account:", error);
    }

```

### Update an Account

The endpoint allows the Subscriber to update their account details.

```ts
import {
    LucidEvolution,
    updateAccount,
    UpdateAccountConfig,
} from "@anastasia-labs/payment-subscription-offchain";

    const updateAccountConfig: UpdateAccountConfig = {
        new_email: "new_business@web3.ada",
        new_phone: "(288) 481-2686-999",
        account_nft_tn: 'ACCOUNT_NFT_TOKEN_NAME', // Replace with actual token name
        subscriber_nft_tn: 'SUBSCRIBER_NFT_TOKEN_NAME', // Replace with actual token name
    };

    // Update Account
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

This endpoint completely removes the Account from the Payment Subscription system.

```ts
import {
    LucidEvolution,
    removeAccount,
    RemoveAccountConfig,
} from "@anastasia-labs/payment-subscription-offchain";

    const removeAccountConfig: RemoveAccountConfig = {
      account_nft_tn: 'ACCOUNT_NFT_TOKEN_NAME', // Replace with actual token name
      subscriber_nft_tn: 'SUBSCRIBER_NFT_TOKEN_NAME', // Replace with actual token name
    };

    // Remove Account
    try {
        const removeAccountUnsigned = await removeAccount(
            lucid,
            removeAccountConfig,
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

This endpoint allows a Subscriber to Subscribe to a Service. 

They can choose the number of intervals they want to subscribe to. 
Ensure the Subscriber has enough ADA to cover the requested fees by the Merchant.

```ts
import { initiateSubscription, InitPaymentConfig, LucidEvolution} from "@anastasia-labs/payment-subscription-offchain";

// Configure the subscription parameters
const subscriptionConfig: InitPaymentConfig = {
  service_nft_tn: 'SERVICE_NFT_TOKEN_NAME', // Replace with actual token name
  account_nft_tn: 'ACCOUNT_NFT_TOKEN_NAME', // Replace with actual token name
  num_intervals: 3n, // Replace with actual intervals to pay for
  subscription_start: BigInt(lucid.currentSlot()) + 60n * 1000n,

};


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

### Merchant Withdraw Subscription Fees

Initiated by the Merchant, this endpoint allows the Merchant to unlock funds from the Payment Contract equivalent to the number of intervals passed of an active Service.

```ts
import { withdrawFees, WithdrawFeesConfig } from "@anastasia-labs/payment-subscription-offchain";

// Configure the withdrawal parameters
const withdrawConfig: MerchantWithdrawConfig = {
  service_nft_tn: 'SERVICE_REF_TOKEN', // Replace with actual unit
  subscriber_nft_tn: 'SUBSCRIBER_TOKEN_UNIT', // Replace with actual unit
  merchant_nft_tn: 'MERCHANT_TOKEN_UNIT', // Replace with actual unit
  payment_nft_tn: 'PAYMENT_NFT_TOKEN_NAME', // Replace with actual token name
  current_time: BigInt(Date.now()),

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

### Extend Subscription

This allows the the Subscriber to update their subscription by extending it to as many intervals as they wish.

```ts

import {
    ExtendPaymentConfig,
    extendSubscription,
    LucidEvolution,
} from "@anastasia-labs/payment-subscription-offchain";


    const extendPaymentConfig: ExtendPaymentConfig = {
        service_nft_tn: serviceNftTn,
        subscriber_nft_tn: 'SUBSCRIBER_NFT_TOKEN_NAME', // Replace with actual token name
        extension_intervals: 1n,
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

This endpoint allows a Subscriber to unsubscribe from a Service.

It is at this point that the penalty fee is deducted from the subscription_fee to be refunded if the Merchant had set it when creating a Service.

```ts
import { unsubscribe, UnsubscribeConfig, LucidEvolution } from "@anastasia-labs/payment-subscription-offchain";


// Configure the unsubscription parameters
const unsubscribeConfig: UnsubscribeConfig = {
  service_nft_tn: 'SERVICE_NFT_TOKEN_NAME', // Replace with actual token name
  subscriber_nft_tn: 'SUBSCRIBER_NFT_TOKEN_NAME', // Replace with actual token name
  current_time: BigInt(Date.now()),
};

// Unsubscribe from the service
try {
      const unsubscribeUnsigned = await unsubscribe(
          lucid,
          unsubscribeConfig,
      );
      const unsubscribeSigned = await unsubscribeUnsigned.sign
          .withWallet()
          .complete();
      const unsubscribeHash = await unsubscribeSigned.submit();

      console.log(
          `Unsubscribed successfully: ${unsubscribeHash}`,
      );
  } catch (error) {
      console.error("Failed to unsubscribe:", error);
  }
```

### Merchant Penalty Withdraw

The Merchant uses this endpoint to claim any **penalty fees** locked in the Payment Contract.

```ts

import {
    LucidEvolution,
    merchantPenaltyWithdraw,
    WithdrawPenaltyConfig,
} from "@anastasia-labs/payment-subscription-offchain";

    const withdrawPenaltyConfig: WithdrawPenaltyConfig = {
      service_nft_tn: 'SERVICE_NFT_TOKEN_NAME', // Replace with actual token name
      merchant_nft_tn: 'MERCHANT_NFT_TOKEN_NAME', // Replace     };

      subscriber_nft_tn: 'SUBSCRIBER_NFT_TOKEN_NAME', // Replace with actual token name

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
};


```

### Subscriber Withdraw

This endpoint allow the Subscriber to unlock funds from the Payment Contract of an **inactive Service**, if at all there were funds left when the Merchant removed/de-activated the Service.

```ts

import {
    Data,
    LucidEvolution,
    ServiceDatum,
    subscriberWithdraw,
    SubscriberWithdrawConfig,
} from "@anastasia-labs/payment-subscription-offchain";
   
    const subscriberWithdrawConfig: SubscriberWithdrawConfig = {
      service_nft_tn: 'SERVICE_NFT_TOKEN_NAME', // Replace with actual token name
      subscriber_nft_tn: 'SUBSCRIBER_NFT_TOKEN_NAME', // Replace with actual token name
    };

    // Subscriber Withdraw
    try {
        const subscriberWithdrawUnsigned = await subscriberWithdraw(
            lucid,
            subscriberWithdrawConfig,
        );
        const subscriberWithdrawSigned = await subscriberWithdrawUnsigned.sign
            .withWallet()
            .complete();
        const subscriberWithdrawTxHash = await subscriberWithdrawSigned.submit();

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

