import { removeService, RemoveServiceConfig } from "../src/index.js";
import {
  Address,
  mintingPolicyToId,
  validatorToAddress,
} from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { getServiceValidatorDatum } from "../src/endpoints/utils.js";
import { SetupResult } from "./setupTest.js";

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
  setupResult: SetupResult,
): Effect.Effect<RemoveServiceResult, Error, never> => {
  return Effect.gen(function* () {
    const { lucid, users, emulator } = setupResult.context;
    const network = lucid.config().network;
    const { serviceUTxOs } = setupResult;

    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
    let serviceAddress: Address;

    serviceAddress = validatorToAddress(
      network,
      serviceValidator.spendService,
    );

    console.log("Service Address: ", serviceAddress);
    console.log("ServiceUTxOs: ", serviceUTxOs);

    const serviceData = yield* Effect.promise(
      () => (getServiceValidatorDatum(serviceUTxOs)),
    );

    if (!serviceData || serviceData.length === 0) {
      throw new Error("serviceData is empty");
    }
    const serviceDatum = serviceData[0];

    console.log("serviceData: ", serviceData[0]);

    const removeServiceConfig: RemoveServiceConfig = {
      service_fee: serviceDatum.service_fee,
      service_fee_qty: serviceDatum.service_fee_qty,
      penalty_fee: serviceDatum.penalty_fee,
      penalty_fee_qty: serviceDatum.penalty_fee_qty,
      interval_length: serviceDatum.interval_length,
      num_intervals: serviceDatum.num_intervals,
      minimum_ada: serviceDatum.minimum_ada,
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

// test<LucidContext>("Test 1 - Remove Service", async () => {
//   const program = Effect.gen(function* () {
//     const context = yield* makeLucidContext("Preprod");
//     const result = yield* removeServiceTestCase(context);
//     return result;
//   });

//   const result = await Effect.runPromise(program);

//   expect(result.txHash).toBeDefined();
//   expect(typeof result.txHash).toBe("string");
//   expect(result.removeServiceConfig).toBeDefined();
// });
