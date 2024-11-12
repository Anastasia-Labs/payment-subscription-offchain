import {
  ServiceDatum,
  updateService,
  UpdateServiceConfig,
} from "../src/index.js";
import { expect, test } from "vitest";
import {
  Address,
  Data,
  mintingPolicyToId,
  validatorToAddress,
} from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { LucidContext, makeLucidContext } from "./service/lucidContext.js";
import { createServiceTestCase } from "./createServiceTestCase.js";
import { getServiceValidatorDatum } from "../src/endpoints/utils.js";

type UpdateServiceResult = {
  txHash: string;
  updateServiceConfig: UpdateServiceConfig;
};

const serviceValidator = readMultiValidators(blueprint, false, []);
const servicePolicyId = mintingPolicyToId(serviceValidator.mintService);

const serviceScript = {
  spending: serviceValidator.spendService.script,
  minting: serviceValidator.mintService.script,
  staking: "",
};

export const updateServiceTestCase = (
  { lucid, users, emulator }: LucidContext,
): Effect.Effect<UpdateServiceResult, Error, never> => {
  return Effect.gen(function* () {
    const network = lucid.config().network;
    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

    if (emulator && lucid.config().network === "Custom") {
      const createServiceResults = yield* createServiceTestCase(
        { lucid, users, emulator },
      );
      expect(createServiceResults).toBeDefined();
      expect(typeof createServiceResults.txHash).toBe("string");
      yield* Effect.sync(() => emulator.awaitBlock(10));
    }

    const serviceAddress: Address = validatorToAddress(
      network,
      serviceValidator.spendService,
    );

    const merchantAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const serviceUTxOs = yield* Effect.promise(() =>
      lucid.config().provider.getUtxos(serviceAddress)
    );

    // Get utxos where is_active in datum is set to true
    const activeServiceUTxOs = serviceUTxOs.filter((utxo) => {
      if (!utxo.datum) return false;

      const datum = Data.from<ServiceDatum>(utxo.datum, ServiceDatum);
      console.log("datum.is_active: ", datum.is_active);

      return datum.is_active === true;
    });

    const merchantUTxOs = yield* Effect.promise(() =>
      lucid.config().provider.getUtxos(merchantAddress)
    );

    console.log("merchantAddress: ", merchantAddress);
    console.log("merchantUTxOs: ", merchantUTxOs);
    console.log("Service Address: ", serviceAddress);
    console.log("serviceUTxOs: ", serviceUTxOs);

    const serviceData = yield* Effect.promise(
      () => (getServiceValidatorDatum(activeServiceUTxOs)),
    );

    const updateServiceConfig: UpdateServiceConfig = {
      new_service_fee: serviceData[0].service_fee,
      new_service_fee_qty: 9_500_000n,
      new_penalty_fee: serviceData[0].penalty_fee,
      new_penalty_fee_qty: 1_000_000n,
      new_interval_length: 1n,
      new_num_intervals: 12n,
      new_minimum_ada: 2_000_000n,
      is_active: serviceData[0].is_active,
      scripts: serviceScript,
    };

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
