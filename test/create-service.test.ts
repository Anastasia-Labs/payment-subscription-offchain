import {
  ADA,
  createService,
  CreateServiceConfig,
  UTxO,
  validatorToAddress,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { LucidContext, makeEmulatorContext } from "./emulator/service.js";

type CreateServiceResult = {
  txHash: string;
  serviceConfig: CreateServiceConfig;
  outputs: {
    merchantUTxOs: UTxO[];
    serviceUTxOs: UTxO[];
  };
};

export const createServiceTestCase = (
  { lucid, users, emulator }: LucidContext,
): Effect.Effect<CreateServiceResult, Error, never> => {
  return Effect.gen(function* () {
    const serviceValidator = readMultiValidators(blueprint, false, []);

    const serviceScript = {
      spending: serviceValidator.spendService.script,
      minting: serviceValidator.mintService.script,
      staking: "",
    };

    const serviceConfig: CreateServiceConfig = {
      service_fee: ADA,
      service_fee_qty: 10_000_000n,
      penalty_fee: ADA,
      penalty_fee_qty: 1_000_000n,
      interval_length: 30n * 24n * 60n * 60n * 1000n, // 30 days in milliseconds,
      num_intervals: 12n,
      minimum_ada: 2_000_000n,
      is_active: true,
      scripts: serviceScript,
    };

    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

    const createServiceFlow = Effect.gen(function* (_) {
      const createServiceUnSigned = yield* createService(
        lucid,
        serviceConfig,
      );
      const createServiceSigned = yield* Effect.promise(() =>
        createServiceUnSigned.sign.withWallet()
          .complete()
      );
      const createServiceHash = yield* Effect.promise(() =>
        createServiceSigned.submit()
      );

      return createServiceHash;
    });

    const createServiceResult = yield* createServiceFlow.pipe(
      Effect.tapError((error) =>
        Effect.log(`Error creating Service: ${error}`)
      ),
      Effect.map((hash) => {
        return hash;
      }),
    );

    yield* Effect.sync(() => emulator.awaitBlock(50));

    const serviceAddress = validatorToAddress(
      "Custom",
      serviceValidator.mintService,
    );

    const [merchantUTxOs, serviceUTxOs] = yield* Effect.all([
      Effect.promise(() => lucid.utxosAt(users.merchant.address)),
      Effect.promise(() => lucid.utxosAt(serviceAddress)),
    ]);

    return {
      txHash: createServiceResult,
      serviceConfig,
      outputs: {
        merchantUTxOs,
        serviceUTxOs,
      },
    };
  });
};

test<LucidContext>("Test 1 - Create Service", async () => {
  const program = Effect.gen(function* ($) {
    const context = yield* makeEmulatorContext;
    const result = yield* createServiceTestCase(context);
    return result;
  });

  const result = await Effect.runPromise(program);
  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");

  expect(result.serviceConfig).toBeDefined();
  expect(result.outputs).toBeDefined();
});
