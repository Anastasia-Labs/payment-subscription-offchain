import { ADA, updateService, UpdateServiceConfig } from "../src/index.js";
import { expect, test } from "vitest";
import {
  mintingPolicyToId,
  toUnit,
  validatorToAddress,
} from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { findCip68TokenNames } from "../src/core/utils/assets.js";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import {
  LucidContext,
  makeEmulatorContext,
  makeLucidContext,
} from "./emulator/service.js";
import { createServiceTestCase } from "./create-service.test.js";

type UpdateServiceResult = {
  txHash: string;
  updateServiceConfig: UpdateServiceConfig;
};

const serviceValidator = readMultiValidators(blueprint, false, []);
const servicePolicyId = mintingPolicyToId(serviceValidator.mintService);

export const updateServiceTestCase = (
  { lucid, users, emulator }: LucidContext,
): Effect.Effect<UpdateServiceResult, Error, never> => {
  return Effect.gen(function* () {
    const createServiceResults = yield* createServiceTestCase(
      { lucid, users, emulator },
    );

    expect(createServiceResults).toBeDefined();
    expect(typeof createServiceResults.txHash).toBe("string");

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
      scripts: createServiceResults.serviceConfig.scripts,
    };

    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

    const updateServiceFlow = Effect.gen(function* (_) {
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
      return updateServiceHash;
    });

    const updateServiceResult = yield* updateServiceFlow.pipe(
      Effect.tapError((error) =>
        Effect.log(`Error updating service: ${error}`)
      ),
      Effect.map((hash) => {
        return hash;
      }),
    );

    // yield* Effect.sync(() => emulator.awaitBlock(50));

    return {
      txHash: updateServiceResult,
      updateServiceConfig,
    };
  });
};

test<LucidContext>("Test 1 - Update Service", async () => {
  const program = Effect.gen(function* () {
    const context = yield* makeLucidContext();
    const result = yield* updateServiceTestCase(context);
    return result;
  });
  const result = await Effect.runPromise(program);

  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");
  expect(result.updateServiceConfig).toBeDefined();
});
