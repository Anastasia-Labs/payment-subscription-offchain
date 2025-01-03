import {
  Data,
  getServiceValidatorDatum,
  removeServiceProgram,
  ServiceDatum,
} from "../src/index.js";
import { Effect } from "effect";
import { SetupResult } from "./setupTest.js";

type RemoveServiceResult = {
  txHash: string;
  // removeServiceConfig: RemoveServiceConfig;
};

export const removeServiceTestCase = (
  setupResult: SetupResult,
): Effect.Effect<RemoveServiceResult, Error, never> => {
  return Effect.gen(function* () {
    const {
      context: { lucid, users },
      serviceUTxOs,
    } = setupResult;

    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

    const removeServiceFlow = Effect.gen(function* (_) {
      const removeServiceUnsigned = yield* removeServiceProgram(
        lucid,
      );
      const removeServiceSigned = yield* Effect.promise(() =>
        removeServiceUnsigned.sign.withWallet()
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
      // removeServiceConfig,
    };
  });
};
