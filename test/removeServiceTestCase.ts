import { removeService, RemoveServiceConfig } from "../src/index.js";
import { Effect } from "effect";
import { SetupResult } from "./setupTest.js";
import { servicePolicyId, serviceScript } from "./common/constants.js";

type RemoveServiceResult = {
  txHash: string;
  removeServiceConfig: RemoveServiceConfig;
};

export const removeServiceTestCase = (
  setupResult: SetupResult,
): Effect.Effect<RemoveServiceResult, Error, never> => {
  return Effect.gen(function* () {
    const {
      context: { lucid, users },
    } = setupResult;

    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
    const removeServiceConfig: RemoveServiceConfig = {
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
