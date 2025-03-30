import {
  UpdateServiceConfig,
  updateServiceProgram,
} from "../src/index.js";
import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext } from "./service/lucidContext.js";
import {
  ServiceSetup,
  setupBase,
  setupService,
} from "./setupTest.js";

type UpdateServiceResult = {
  txHash: string;
  updateServiceConfig: UpdateServiceConfig;
};

export const updateServiceTestCase = (
  setupResult: ServiceSetup,
): Effect.Effect<UpdateServiceResult, Error, never> => {
  return Effect.gen(function* () {
    const {
      context: { lucid, users },
      serviceNftTn,
      merchantNftTn,
    } = setupResult;

    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

    const updateServiceConfig: UpdateServiceConfig = {
      service_nft_tn: serviceNftTn,
      merchant_nft_tn: merchantNftTn,
      new_service_fee: 9_500_000n,
      new_penalty_fee: 1_000_000n,
      new_interval_length: 60000n,
      new_num_intervals: 12n,
    };

    const updateServiceFlow = Effect.gen(function* (_) {
      const updateServiceUnsigned = yield* updateServiceProgram(lucid, updateServiceConfig);
      const updateServiceSigned = yield* Effect.promise(() => updateServiceUnsigned.sign.withWallet().complete());
      const updateServiceHash = yield* Effect.promise(() => updateServiceSigned.submit());
      return updateServiceHash;
    });

    const updateServiceResult = yield* updateServiceFlow.pipe(
      Effect.tapError((error) => Effect.log(`Error updating service: ${error}`)),
      Effect.map((hash) => {
        return hash;
      }),
    );

    return {
      txHash: updateServiceResult,
      updateServiceConfig,
    };
  });
};

test<LucidContext>("Test 2 - Update Service", async () => {
  const program = Effect.gen(function* () {
    const base = yield* setupBase();
    const setupContext = yield* setupService(base);
    const result = yield* updateServiceTestCase(setupContext);
    return result;
  });
  const result = await Effect.runPromise(program);

  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");
  expect(result.updateServiceConfig).toBeDefined();
});
