import { removeService, RemoveServiceConfig } from "../src/index.js";
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
import { LucidContext, makeEmulatorContext } from "./emulator/service.js";
import { createServiceTestCase } from "./create-service.test.js";

type RemoveServiceResult = {
  txHash: string;
  removeServiceConfig: RemoveServiceConfig;
};

const serviceValidator = readMultiValidators(blueprint, false, []);
const servicePolicyId = mintingPolicyToId(serviceValidator.mintService);

export const removeServiceTestCase = (
  { lucid, users, emulator }: LucidContext,
): Effect.Effect<RemoveServiceResult, Error, never> => {
  return Effect.gen(function* () {
    const createServiceResult = yield* createServiceTestCase(
      { lucid, users, emulator },
    );

    expect(createServiceResult).toBeDefined();
    expect(typeof createServiceResult.txHash).toBe("string");

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

    const removeServiceConfig: RemoveServiceConfig = {
      service_fee: createServiceResult.serviceConfig.service_fee,
      service_fee_qty: createServiceResult.serviceConfig.service_fee_qty,
      penalty_fee: createServiceResult.serviceConfig.penalty_fee,
      penalty_fee_qty: createServiceResult.serviceConfig.penalty_fee_qty,
      interval_length: createServiceResult.serviceConfig.interval_length,
      num_intervals: createServiceResult.serviceConfig.num_intervals,
      minimum_ada: createServiceResult.serviceConfig.minimum_ada,
      is_active: false,
      user_token: userNft,
      ref_token: refNft,
      scripts: createServiceResult.serviceConfig.scripts,
    };

    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

    const removeServiceFlow = Effect.gen(function* (_) {
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
      return removeServiceHash;
    });

    const removeServiceResult = yield* removeServiceFlow.pipe(
      Effect.tapError((error) =>
        Effect.log(`Error removing service: ${error}`)
      ),
      Effect.map((hash) => {
        return hash;
      }),
    );

    yield* Effect.sync(() => emulator.awaitBlock(50));

    return {
      txHash: removeServiceResult,
      removeServiceConfig,
    };
  });
};

test<LucidContext>("Test 1 - Remove Service", async () => {
  const program = Effect.gen(function* () {
    const context = yield* makeEmulatorContext;
    const result = yield* removeServiceTestCase(context);
    return result;
  });

  const result = await Effect.runPromise(program);

  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");
  expect(result.removeServiceConfig).toBeDefined();
});
