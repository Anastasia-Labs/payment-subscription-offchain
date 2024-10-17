import { removeService, RemoveServiceConfig } from "../src/index.js";
import { expect, test } from "vitest";
import {
  Address,
  mintingPolicyToId,
  validatorToAddress,
} from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { LucidContext, makeLucidContext } from "./emulator/service.js";
import { createServiceTestCase } from "./createServiceTestCase.js";
import { getServiceValidatorDatum } from "../src/endpoints/utils.js";

type RemoveServiceResult = {
  txHash: string;
  removeServiceConfig: RemoveServiceConfig;
};

const serviceValidator = readMultiValidators(blueprint, false, []);
const servicePolicyId = mintingPolicyToId(serviceValidator.mintService);

const serviceScript = {
  spending: serviceValidator.spendService.script,
  minting: serviceValidator.mintService.script,
  staking: "",
};

export const removeServiceTestCase = (
  { lucid, users, emulator }: LucidContext,
): Effect.Effect<RemoveServiceResult, Error, never> => {
  return Effect.gen(function* () {
    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
    let serviceAddress: Address;
    const merchantAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    if (emulator && lucid.config().network === "Custom") {
      const createServiceResult = yield* createServiceTestCase(
        { lucid, users, emulator },
      );

      expect(createServiceResult).toBeDefined();
      expect(typeof createServiceResult.txHash).toBe("string");

      yield* Effect.sync(() => emulator.awaitBlock(50));

      serviceAddress = validatorToAddress(
        "Custom",
        serviceValidator.spendService,
      );
    } else {
      serviceAddress = validatorToAddress(
        "Preprod",
        serviceValidator.spendService,
      );
    }

    const merchantUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(merchantAddress)
    );

    const serviceUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(serviceAddress)
    );

    // console.log("Address: ", merchantAddress);
    // console.log("subscriberUTxOs: ", merchantUTxOs);
    // console.log("Account Address: ", serviceAddress);
    // console.log("AccountUTxOs: ", serviceUTxOs);

    const serviceData = yield* Effect.promise(
      () => (getServiceValidatorDatum(serviceUTxOs)),
    );

    const removeServiceConfig: RemoveServiceConfig = {
      service_fee: serviceData[0].service_fee,
      service_fee_qty: serviceData[0].service_fee_qty,
      penalty_fee: serviceData[0].penalty_fee,
      penalty_fee_qty: serviceData[0].penalty_fee_qty,
      interval_length: serviceData[0].interval_length,
      num_intervals: serviceData[0].num_intervals,
      minimum_ada: serviceData[0].minimum_ada,
      is_active: false,
      service_cs: servicePolicyId,
      scripts: serviceScript,
    };

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

    return {
      txHash: removeServiceResult,
      removeServiceConfig,
    };
  });
};

test<LucidContext>("Test 1 - Remove Service", async () => {
  const program = Effect.gen(function* () {
    const context = yield* makeLucidContext("Preprod");
    const result = yield* removeServiceTestCase(context);
    return result;
  });

  const result = await Effect.runPromise(program);

  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");
  expect(result.removeServiceConfig).toBeDefined();
});
