import {
  ServiceDatum,
  UpdateServiceConfig,
  updateServiceProgram,
} from "../src/index.js";
import { expect, test } from "vitest";
import { Address, Data } from "@lucid-evolution/lucid";
import { Effect } from "effect";
import { LucidContext } from "./service/lucidContext.js";
import { getServiceValidatorDatum } from "../src/endpoints/utils.js";
import { SetupResult, setupTest } from "./setupTest.js";

type UpdateServiceResult = {
  txHash: string;
  updateServiceConfig: UpdateServiceConfig;
};

export const updateServiceTestCase = (
  setupResult: SetupResult,
): Effect.Effect<UpdateServiceResult, Error, never> => {
  return Effect.gen(function* () {
    const {
      context: { lucid, users, emulator },
      serviceUTxOs,
      serviceNftTn,
      merchantNftTn,
    } = setupResult;

    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

    const merchantAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    // Get utxos where is_active in datum is set to true
    const activeServiceUTxOs = serviceUTxOs.filter((utxo) => {
      if (!utxo.datum) return false;

      const datum = Data.from<ServiceDatum>(utxo.datum, ServiceDatum);

      return datum.is_active === true;
    });

    const serviceData = yield* Effect.promise(
      () => (getServiceValidatorDatum(activeServiceUTxOs)),
    );

    const updateServiceConfig: UpdateServiceConfig = {
      service_nft_tn: serviceNftTn,
      merchant_nft_tn: merchantNftTn,
      new_service_fee: serviceData[0].service_fee,
      new_service_fee_qty: 9_500_000n,
      new_penalty_fee: serviceData[0].penalty_fee,
      new_penalty_fee_qty: 1_000_000n,
      new_interval_length: 1n,
      new_num_intervals: 12n,
      new_minimum_ada: 2_000_000n,
      is_active: serviceData[0].is_active,
    };

    const updateServiceFlow = Effect.gen(function* (_) {
      const updateServiceUnsigned = yield* updateServiceProgram(
        lucid,
        updateServiceConfig,
      );
      const updateServiceSigned = yield* Effect.promise(() =>
        updateServiceUnsigned.sign.withWallet()
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

    return {
      txHash: updateServiceResult,
      updateServiceConfig,
    };
  });
};

test<LucidContext>("Test 2 - Update Service", async () => {
  const program = Effect.gen(function* () {
    const setupContext = yield* setupTest();
    const result = yield* updateServiceTestCase(setupContext);
    return result;
  });
  const result = await Effect.runPromise(program);

  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");
  expect(result.updateServiceConfig).toBeDefined();
});
