import {
  ADA,
  createService,
  CreateServiceConfig,
  Emulator,
  generateEmulatorAccount,
  Lucid,
  LucidEvolution,
  PROTOCOL_PARAMETERS_DEFAULT,
  UTxO,
  validatorToAddress,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";

type LucidContext = {
  lucid: LucidEvolution;
  users: any;
  emulator: Emulator;
};

// INITIALIZE EMULATOR + ACCOUNTS
beforeEach<LucidContext>(async (context) => {
  context.users = {
    merchant: await generateEmulatorAccount({
      lovelace: BigInt(100_000_000),
    }),
  };

  context.emulator = new Emulator([
    context.users.merchant,
  ], { ...PROTOCOL_PARAMETERS_DEFAULT, maxTxSize: 19000 });

  context.lucid = await Lucid(context.emulator, "Custom");
});

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
    console.log("Create Subscription Service...TEST!!!!");

    const serviceValidator = readMultiValidators(false, []);

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
      interval_length: 30n * 24n * 60n * 60n * 1000n, // 30 days in seconds,
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
        console.log("Service created successfully. TxHash:", hash);
        return hash;
      }),
    );

    yield* Effect.sync(() => emulator.awaitBlock(100));

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

test<LucidContext>("Test 1 - Create Service", async (context) => {
  const result = await Effect.runPromise(createServiceTestCase(context));
  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");

  expect(result.serviceConfig).toBeDefined();
  expect(result.outputs).toBeDefined();
});
