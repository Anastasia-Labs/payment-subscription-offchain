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
  PROTOCOL_PARAMETERS_DEFAULT,
  toUnit,
  Unit,
  UTxO,
  validatorToAddress,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import { readMultiValidators } from "./compiled/validators.js";
import { Console, Effect } from "effect";
import { findCip68TokenNames } from "../src/core/utils/assets.js";
import { createAccountTestCase } from "./create-account.test.js";
import { createServiceTestCase } from "./create-service.test.js";

type LucidContext = {
  lucid: LucidEvolution;
  users: any;
  emulator: Emulator;
};

// INITIALIZE EMULATOR + ACCOUNTS
beforeEach<LucidContext>(async (context) => {
  context.users = {
    subscriber: await generateEmulatorAccount({
      lovelace: BigInt(1000_000_000),
    }),
    merchant: await generateEmulatorAccount({
      lovelace: BigInt(1000_000_000),
    }),
  };

  context.emulator = new Emulator([
    context.users.subscriber,
    context.users.merchant,
  ], { ...PROTOCOL_PARAMETERS_DEFAULT, maxTxSize: 19000 });

  context.lucid = await Lucid(context.emulator, "Custom");
});

type InitiateSubscriptionResult = {
  txHash: string;
  paymentConfig: InitPaymentConfig;
  outputs: {
    subscriberUTxOs: UTxO[];
    serviceValidatorUTxOs: UTxO[];
    paymentValidatorUTxOs: UTxO[];
    accUsrNft: Unit;
    servcRefNft: Unit;
  };
};

export const initiateSubscriptionTestCase = (
  { lucid, users, emulator }: LucidContext,
): Effect.Effect<InitiateSubscriptionResult, Error, never> => {
  return Effect.gen(function* () {
    // Existing test logic goes here
    console.log("Initiaie Subscription Account...TEST!!!!");

    const validators = readMultiValidators(false, []);

    const createAccountResult = yield* createAccountTestCase({
      lucid,
      users,
      emulator,
    });

    expect(createAccountResult).toBeDefined();
    expect(typeof createAccountResult.txHash).toBe("string"); // Assuming the createAccountResult is a transaction hash
    console.log(
      "Create Account with transaction hash:",
      createAccountResult.txHash,
    );

    yield* Effect.sync(() => emulator.awaitBlock(100));

    console.log("Create Subscription Service...TEST!!!!");

    const createServiceResult = yield* createServiceTestCase({
      lucid,
      users,
      emulator,
    });

    expect(createServiceResult).toBeDefined();
    expect(typeof createServiceResult.txHash).toBe("string"); // Assuming the createServiceResult is a transaction hash
    console.log(
      "Create Account with transaction hash:",
      createServiceResult.txHash,
    );

    yield* Effect.sync(() => emulator.awaitBlock(100));

    const servicePolicyId = mintingPolicyToId(validators.mintService);
    const accountPolicyId = mintingPolicyToId(validators.mintAccount);

    const paymentValidator = readMultiValidators(true, [
      servicePolicyId,
      accountPolicyId,
    ]);

    // console.log("Payment validator address", paymentValidatorAddress);

    const paymentScript = {
      spending: paymentValidator.spendPayment.script,
      minting: paymentValidator.mintPayment.script,
      staking: "",
    };
    // Find the Account token names
    const { refTokenName: accRefName, userTokenName: accUserName } =
      findCip68TokenNames([
        ...createAccountResult.outputs.accountUTxOs,
        ...createAccountResult.outputs.subscriberUTxOs,
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
        ...createServiceResult.outputs.serviceUTxOs,
        ...createServiceResult.outputs.merchantUTxOs,
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

    const interval_length = createServiceResult.serviceConfig.interval_length;
    const num_intervals = createServiceResult.serviceConfig.num_intervals;
    const subscription_end = BigInt(emulator.now()) +
      interval_length * num_intervals;

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
      interval_amount: createServiceResult.serviceConfig.service_fee_qty,
      num_intervals: num_intervals,
      last_claimed: 500000n,
      penalty_fee: ADA,
      penalty_fee_qty: createServiceResult.serviceConfig.penalty_fee_qty,
      minimum_ada: createServiceResult.serviceConfig.minimum_ada,
      scripts: paymentScript,
      subscriberUTxO: createAccountResult.outputs.subscriberUTxOs,
      serviceUTxO: createServiceResult.outputs.serviceUTxOs,
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

    const paymentValidatorAddress = validatorToAddress(
      "Custom",
      paymentValidator.mintPayment,
    );

    const serviceAddress = validatorToAddress(
      "Custom",
      validators.mintService,
    );

    const [paymentValidatorUTxOs, subscriberUTxOs, serviceValidatorUTxOs] =
      yield* Effect.all([
        Effect.promise(() => lucid.utxosAt(paymentValidatorAddress)),
        Effect.promise(() => lucid.utxosAt(users.subscriber.address)),
        Effect.promise(() => lucid.utxosAt(serviceAddress)),
      ]);

    yield* Console.log("Payment Validator Utxos:", paymentValidatorUTxOs);
    yield* Console.log("Account- Subscriber Utxos:", subscriberUTxOs);
    yield* Console.log("Service- Validator Utxos:", serviceValidatorUTxOs);

    return {
      txHash: subscriptionResult,
      paymentConfig,
      outputs: {
        subscriberUTxOs,
        serviceValidatorUTxOs,
        paymentValidatorUTxOs,
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
  // console.log("Subscription initiated with transaction hash:", result);

  expect(result.paymentConfig).toBeDefined();
  expect(result.outputs).toBeDefined();
});
