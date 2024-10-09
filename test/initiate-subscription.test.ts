import {
  ADA,
  Emulator,
  generateEmulatorAccount,
  initiateSubscription,
  InitPaymentConfig,
  Lucid,
  LucidEvolution,
  mintingPolicyToId,
  PROTOCOL_PARAMETERS_DEFAULT,
  toUnit,
  UTxO,
  validatorToAddress,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import { readMultiValidators } from "./compiled/validators.js";
import { Console, Effect } from "effect";
import { findCip68TokenNames } from "../src/core/utils/assets.js";
import { createAccountTestCase } from "./create-account.test.js";
import { createServiceTestCase } from "./create-service.test.js";
import blueprint from "./compiled/plutus.json" assert { type: "json" };

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
  ], { ...PROTOCOL_PARAMETERS_DEFAULT, maxTxSize: 21000 });

  context.lucid = await Lucid(context.emulator, "Custom");
});

type InitiateSubscriptionResult = {
  txHash: string;
  paymentConfig: InitPaymentConfig;
  outputs: {
    merchantUTxOs: UTxO[];
    subscriberUTxOs: UTxO[];
    serviceValidatorUTxOs: UTxO[];
    paymentValidatorUTxOs: UTxO[];
  };
};

export const initiateSubscriptionTestCase = (
  { lucid, users, emulator }: LucidContext,
): Effect.Effect<InitiateSubscriptionResult, Error, never> => {
  return Effect.gen(function* () {
    const validators = readMultiValidators(blueprint, false, []);

    const createAccountResult = yield* createAccountTestCase({
      lucid,
      users,
      emulator,
    });

    expect(createAccountResult).toBeDefined();
    expect(typeof createAccountResult.txHash).toBe("string");

    yield* Effect.sync(() => emulator.awaitBlock(100));

    const createServiceResult = yield* createServiceTestCase({
      lucid,
      users,
      emulator,
    });

    expect(createServiceResult).toBeDefined();
    expect(typeof createServiceResult.txHash).toBe("string");

    yield* Effect.sync(() => emulator.awaitBlock(100));

    const servicePolicyId = mintingPolicyToId(validators.mintService);
    const accountPolicyId = mintingPolicyToId(validators.mintAccount);

    const paymentValidator = readMultiValidators(blueprint, true, [
      servicePolicyId,
      accountPolicyId,
    ]);

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

    const interval_amount = createServiceResult.serviceConfig.service_fee_qty;
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
      total_subscription_fee: interval_amount * num_intervals,
      subscription_start: BigInt(emulator.now()),
      subscription_end: subscription_end,
      interval_length: interval_length, //30n * 24n * 60n * 60n * 1000n,
      interval_amount: interval_amount,
      num_intervals: num_intervals,
      last_claimed: 500000n,
      penalty_fee: ADA,
      penalty_fee_qty: createServiceResult.serviceConfig.penalty_fee_qty,
      minimum_ada: createServiceResult.serviceConfig.minimum_ada,
      scripts: paymentScript,
      subscriberUTxO: createAccountResult.outputs.subscriberUTxOs,
      serviceUTxO: createServiceResult.outputs.serviceUTxOs,
      service_user_token: serviceUserNft,
      service_ref_token: servcRefNft,
      account_user_token: accUsrNft,
      account_ref_token: accRefNft,
    };

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

      yield* Effect.sync(() => emulator.awaitBlock(50));

      return initiateSubscriptionHash;
    });

    const subscriptionResult = yield* initiateSubscriptionFlow.pipe(
      Effect.tapError((error) =>
        Effect.log(`Error initiating subscription: ${error}`)
      ),
      Effect.map((hash) => {
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
    const merchantUTxOs = createServiceResult.outputs.merchantUTxOs;

    return {
      txHash: subscriptionResult,
      paymentConfig,
      outputs: {
        merchantUTxOs,
        subscriberUTxOs,
        serviceValidatorUTxOs,
        paymentValidatorUTxOs,
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

  expect(result.paymentConfig).toBeDefined();
  expect(result.outputs).toBeDefined();
});
