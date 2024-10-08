import {
  ADA,
  createService,
  CreateServiceConfig,
  Emulator,
  generateEmulatorAccount,
  getValidatorDatum,
  Lucid,
  LucidEvolution,
  removeService,
  RemoveServiceConfig,
} from "../src/index.js";
import { beforeEach, test } from "vitest";
import {
  mintingPolicyToId,
  toUnit,
  validatorToAddress,
} from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { findCip68TokenNames } from "../src/core/utils/assets.js";

type LucidContext = {
  lucid: LucidEvolution;
  users: any;
  emulator: Emulator;
};

const serviceValidator = readMultiValidators(false, []);
const servicePolicyId = mintingPolicyToId(serviceValidator.mintService);

// INITIALIZE EMULATOR + ACCOUNTS
beforeEach<LucidContext>(async (context) => {
  context.users = {
    merchant: await generateEmulatorAccount({
      lovelace: BigInt(100_000_000),
    }),
  };

  context.emulator = new Emulator([
    context.users.merchant,
  ]);

  context.lucid = await Lucid(context.emulator, "Custom");
});

test<LucidContext>("Test 1 - Remove Service", async ({
  lucid,
  users,
  emulator,
}) => {
  const program = Effect.gen(function* () {
    console.log("Remove Subscription Service...TEST!!!!");

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
    console.log("Create Service TxHash: ", createServiceHash);

    yield* Effect.sync(() => emulator.awaitBlock(100));

    const merchantUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(users.merchant.address)
    );

    const serviceScriptAddress = validatorToAddress(
      "Custom",
      serviceValidator.spendService,
    );

    const serviceUTxO = yield* Effect.promise(() =>
      lucid.utxosAt(serviceScriptAddress)
    );

    // Find the token names
    const { refTokenName, userTokenName } = findCip68TokenNames([
      ...serviceUTxO,
      ...merchantUTxOs,
    ], servicePolicyId);

    const refNft = toUnit(
      servicePolicyId,
      refTokenName,
    );

    const userNft = toUnit(
      servicePolicyId,
      userTokenName,
    );
    const validatorUtxos = yield* Effect.promise(() =>
      getValidatorDatum(lucid, createServiceConfig)
    );

    const removeServiceConfig: RemoveServiceConfig = {
      service_fee: validatorUtxos[0].service_fee,
      service_fee_qty: validatorUtxos[0].service_fee_qty,
      penalty_fee: validatorUtxos[0].penalty_fee,
      penalty_fee_qty: validatorUtxos[0].penalty_fee_qty,
      interval_length: validatorUtxos[0].interval_length,
      num_intervals: validatorUtxos[0].num_intervals,
      minimum_ada: validatorUtxos[0].minimum_ada,
      is_active: false,
      user_token: userNft,
      ref_token: refNft,
      scripts: serviceScript,
    };

    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

    const removeServiceResult = yield* removeService(
      lucid,
      removeServiceConfig,
    );
    const removeServiceSigned = yield* Effect.promise(() =>
      removeServiceResult.sign.withWallet()
        .complete()
    );
    const removeServiceHash = yield* Effect.promise(() =>
      removeServiceSigned.submit()
    );
    console.log("Remove Service TxHash: ", removeServiceHash);
  });
  await Effect.runPromise(program);
});
