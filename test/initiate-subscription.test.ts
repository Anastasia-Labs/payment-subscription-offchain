//Input 1 --> Subscriber utxo which has account NFT  - done // create account
//Input 2 --> service validator with refnft -- done  -- create service
//purpose -mintAssets(paymentNFT==> Payment validator policyid+tokenname)
//output1 --> subscriber utxo with account nft
//output2 --> payment NFt at the payment validator

import {
  ADA,
  createAccount,
  CreateAccountConfig,
  createService,
  CreateServiceConfig,
  Emulator,
  generateEmulatorAccount,
  getValidatorDatum,
  initiateSubscription,
  InitPaymentConfig,
  Lucid,
  LucidEvolution,
  mintingPolicyToId,
  toUnit,
  validatorToAddress,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import { readMultiValidators } from "./compiled/validators.js";
import { Console, Effect } from "effect";
import { findCip68TokenNames } from "../src/core/utils/assets.js";

type LucidContext = {
  lucid: LucidEvolution;
  users: any;
  emulator: Emulator;
};

// INITIALIZE EMULATOR + ACCOUNTS
beforeEach<LucidContext>(async (context) => {
  context.users = {
    subscriber: await generateEmulatorAccount({
      lovelace: BigInt(100_000_000),
    }),
    merchant: await generateEmulatorAccount({
      lovelace: BigInt(100_000_000),
    }),
  };

  context.emulator = new Emulator([
    context.users.subscriber,
    context.users.merchant,
  ]);

  context.lucid = await Lucid(context.emulator, "Custom");
});

type InitiateSubscriptionResult = {
  txHash: string;
  paymentConfig: InitPaymentConfig;
  additionalInfo: {
    paymentValidatorAddress: string;
    serviceAddress: string;
    accountPolicyId: string;
    servicePolicyId: string;
    accUsrNft: string;
    servcRefNft: string;
  };
};

export const initiateSubscriptionTestCase = (
  { lucid, users, emulator }: LucidContext,
): Effect.Effect<InitiateSubscriptionResult, Error, never> => {
  return Effect.gen(function* () {
    // Existing test logic goes here
    console.log("createSubscriptionAccount...TEST!!!!");

    const accountValidator = readMultiValidators(false, []);

    const accountScript = {
      spending: accountValidator.spendAccount.script,
      minting: accountValidator.mintAccount.script,
      staking: "",
    };
    const accountPolicyId = mintingPolicyToId(accountValidator.mintAccount);

    const createAccountConfig: CreateAccountConfig = {
      email: "business@web3.ada",
      phone: "288-481-2686",
      account_created: BigInt(emulator.now()),
      scripts: accountScript,
    };

    lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
    const accountAddress = validatorToAddress(
      "Custom",
      accountValidator.spendAccount,
    );

    const createAccountResult = yield* createAccount(
      lucid,
      createAccountConfig,
    );

    const createAccountSigned = yield* Effect.promise(() =>
      createAccountResult.sign.withWallet()
        .complete()
    );
    const createAccountHash = yield* Effect.promise(() =>
      createAccountSigned.submit()
    );
    console.log("TxHash: ", createAccountHash);

    emulator.awaitBlock(100);

    const subscriberUTxO = yield* Effect.promise(() =>
      lucid.utxosAt(users.subscriber.address)
    );
    console.log("Subscriber UTxO after creation of account:", subscriberUTxO);

    const accountScriptUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(accountAddress)
    );

    console.log(
      "Validator UTxOs after creation of account",
      accountScriptUTxOs,
    );

    emulator.awaitBlock(100);

    console.log("createSubscriptionService...TEST!!!!");

    const serviceValidator = readMultiValidators(false, []);

    const servicePolicyId = mintingPolicyToId(serviceValidator.mintService);

    const serviceScript = {
      spending: serviceValidator.spendService.script,
      minting: serviceValidator.mintService.script,
      staking: "",
    };

    const createServiceConfig: CreateServiceConfig = {
      service_fee: ADA,
      service_fee_qty: 10_000_000n,
      penalty_fee: ADA,
      penalty_fee_qty: 1_000_000n,
      interval_length: 1n,
      num_intervals: 12n,
      minimum_ada: 2_000_000n,
      is_active: true,
      scripts: serviceScript,
    };

    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

    const createServiceUnSigned = yield* createService(
      lucid,
      createServiceConfig,
    );
    const createServiceSigned = yield* Effect.promise(() =>
      createServiceUnSigned.sign.withWallet()
        .complete()
    );
    const createServiceHash = yield* Effect.promise(() =>
      createServiceSigned.submit()
    );

    emulator.awaitBlock(100);

    const serviceAddress = validatorToAddress(
      "Custom",
      serviceValidator.mintService,
    );

    const serviceScriptUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(serviceAddress)
    );
    //console.log("Service Validator mint Address: ", serviceAddress);
    const merchantUTxO = yield* Effect.promise(() =>
      lucid.utxosAt(users.merchant.address)
    );
    console.log("walletUTxO after create service: ", merchantUTxO);
    console.log("Validator utxos after create service: ", serviceScriptUTxOs);
    emulator.awaitBlock(100);

    const serviceValidatorDatum = yield* Effect.promise(() =>
      getValidatorDatum(
        lucid,
        createServiceConfig,
      )
    );

    console.log("Service Validator Utxos", serviceValidatorDatum);
    const interval_length = serviceValidatorDatum[0].interval_length;
    const num_intervals = serviceValidatorDatum[0].num_intervals;
    const subscription_end = BigInt(emulator.now()) +
      interval_length * num_intervals;

    const paymentValidator = readMultiValidators(true, [
      servicePolicyId,
      accountPolicyId,
    ]);

    const paymentValidatorAddress = validatorToAddress(
      "Custom",
      paymentValidator.mintPayment,
    );
    console.log("Payment validator address", paymentValidatorAddress);

    const paymentScript = {
      spending: paymentValidator.spendPayment.script,
      minting: paymentValidator.mintPayment.script,
      staking: "",
    };
    // Find the Account token names
    const { refTokenName: accRefName, userTokenName: accUserName } =
      findCip68TokenNames([
        ...accountScriptUTxOs,
        ...subscriberUTxO,
      ], accountPolicyId);

    const accRefNft = toUnit(
      accountPolicyId,
      accRefName,
    );

    const accUsrNft = toUnit(
      accountPolicyId,
      accUserName,
    );

    // Service NFTs
    const { refTokenName: serviceRefName, userTokenName: serviceUserName } =
      findCip68TokenNames([
        ...serviceScriptUTxOs,
        ...merchantUTxO,
      ], servicePolicyId);

    const servcRefNft = toUnit(
      servicePolicyId,
      serviceRefName,
    );

    const serviceUserNft = toUnit(
      servicePolicyId,
      serviceUserName,
    );

    const accountNFTUtxo = yield* Effect.promise(() =>
      lucid.utxosAtWithUnit(
        users.subscriber.address,
        accUsrNft,
      )
    );
    const serviceNFTUtxo = yield* Effect.promise(() =>
      lucid.utxosAtWithUnit(
        serviceAddress,
        servcRefNft,
      )
    );

    const paymentConfig: InitPaymentConfig = {
      service_nft_tn: serviceRefName,
      account_nft_tn: accUserName,
      account_policyId: accountPolicyId,
      service_policyId: servicePolicyId,
      subscription_fee: ADA,
      total_subscription_fee: 120_000_000n,
      subscription_start: BigInt(emulator.now()),
      subscription_end: subscription_end,
      interval_length: interval_length, //30n * 24n * 60n * 60n * 1000n,
      interval_amount: 10_000_000n,
      num_intervals: num_intervals,
      last_claimed: 500000n,
      penalty_fee: ADA,
      penalty_fee_qty: 1_000_000n,
      minimum_ada: 1_000_000n,
      scripts: paymentScript,
      accountUtxo: accountNFTUtxo,
      serviceUtxo: serviceNFTUtxo,
      minting_Policy: paymentValidator.mintPayment, //MintingPolicy
    };

    console.log("Payment config", paymentConfig);
    lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

    const initiateSubscriptionFlow = Effect.gen(function* (_) {
      const initiateSubscriptionUnsigned = yield* initiateSubscription(
        lucid,
        paymentConfig,
      );

      const initiateSubscriptionSigned = yield* Effect.tryPromise(() =>
        initiateSubscriptionUnsigned.sign.withWallet().complete()
      );

      const initiateSubscriptionHash = yield* Effect.tryPromise(() =>
        initiateSubscriptionSigned.submit()
      );

      yield* Effect.log(`TxHash: ${initiateSubscriptionHash}`);

      yield* Effect.sync(() => emulator.awaitBlock(50));

      const [paymentValidatorUtxos, subscriberUtxos, serviceValidatorUtxos] =
        yield* Effect.all([
          Effect.promise(() => lucid.utxosAt(paymentValidatorAddress)),
          Effect.promise(() => lucid.utxosAt(users.subscriber.address)),
          Effect.promise(() => lucid.utxosAt(serviceAddress)),
        ]);

      yield* Console.log("Payment Validator Utxos:", paymentValidatorUtxos);
      yield* Console.log("Account- Subscriber Utxos:", subscriberUtxos);
      yield* Console.log("Service- Validator Utxos:", serviceValidatorUtxos);

      return initiateSubscriptionHash;
    });

    const subscriptionResult = yield* initiateSubscriptionFlow.pipe(
      Effect.tapError((error) =>
        Effect.log(`Error initiating subscription: ${error}`)
      ),
      Effect.map((hash) => {
        console.log("Subscription initiated successfully. TxHash:", hash);
        return hash;
      }),
    );

    return {
      txHash: subscriptionResult,
      paymentConfig,
      additionalInfo: {
        paymentValidatorAddress,
        serviceAddress,
        accountPolicyId,
        servicePolicyId,
        accUsrNft,
        servcRefNft,
      },
    };
  });
};

test<LucidContext>("Test 1 - Initiate subscription", async (
  context,
) => {
  const result = await Effect.runPromise(initiateSubscriptionTestCase(context));
  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");
  console.log("Subscription initiated with transaction hash:", result);

  expect(result.paymentConfig).toBeDefined();
  expect(result.additionalInfo.paymentValidatorAddress).toBeDefined();
});

// await Effect.runPromise(program);
// });
