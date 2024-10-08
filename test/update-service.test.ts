import {
  ADA,
  createService,
  CreateServiceConfig,
  Emulator,
  generateEmulatorAccount,
  Lucid,
  LucidEvolution,
  updateService,
  UpdateServiceConfig,
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

test<LucidContext>("Test 1 - Update Service", async ({
  lucid,
  users,
  emulator,
}) => {
  const program = Effect.gen(function* () {
    console.log("Update Subscription Service...TEST!!!!");

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

    const updateServiceConfig: UpdateServiceConfig = {
      new_service_fee: ADA,
      new_service_fee_qty: 9_500_000n,
      new_penalty_fee: ADA,
      new_penalty_fee_qty: 1_000_000n,
      new_interval_length: 1n,
      new_num_intervals: 12n,
      new_minimum_ada: 2_000_000n,
      is_active: true,
      user_token: userNft,
      ref_token: refNft,
      scripts: serviceScript,
    };

    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

    const updateServiceResult = yield* updateService(
      lucid,
      updateServiceConfig,
    );
    const updateServiceSigned = yield* Effect.promise(() =>
      updateServiceResult.sign.withWallet()
        .complete()
    );
    const updateServiceHash = yield* Effect.promise(() =>
      updateServiceSigned.submit()
    );
    console.log("Update Service TxHash: ", updateServiceHash);
  });
  await Effect.runPromise(program);
});
