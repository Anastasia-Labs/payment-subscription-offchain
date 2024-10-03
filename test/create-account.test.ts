import {
  createAccount,
  CreateAccountConfig,
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
import { Console, Effect } from "effect";

type LucidContext = {
  lucid: LucidEvolution;
  users: any;
  emulator: Emulator;
};

// INITIALIZE EMULATOR + ACCOUNTS
beforeEach<LucidContext>(async (context) => {
  context.users = {
    subscriber: await generateEmulatorAccount({
      lovelace: BigInt(100_000_000),
    }),
  };

  context.emulator = new Emulator([
    context.users.subscriber,
  ], { ...PROTOCOL_PARAMETERS_DEFAULT, maxTxSize: 19000 });

  context.lucid = await Lucid(context.emulator, "Custom");
});

type CreateAccountResult = {
  txHash: string;
  accountConfig: CreateAccountConfig;
  outputs: {
    subscriberUTxOs: UTxO[];
    accountUTxOs: UTxO[];
  };
};

export const createAccountTestCase = (
  { lucid, users, emulator }: LucidContext,
): Effect.Effect<CreateAccountResult, Error, never> => {
  return Effect.gen(function* () {
    console.log("createSubscriptionAccount...TEST!!!!");

    const accountValidator = readMultiValidators(false, []);

    const accountScript = {
      spending: accountValidator.spendAccount.script,
      minting: accountValidator.mintAccount.script,
      staking: "",
    };

    const accountConfig: CreateAccountConfig = {
      email: "business@web3.ada",
      phone: "288-481-2686",
      account_created: BigInt(emulator.now()),
      scripts: accountScript,
    };

    lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
    const accountAddress = validatorToAddress(
      "Custom",
      accountValidator.mintAccount,
    );

    const createAccountFlow = Effect.gen(function* (_) {
      const createAccountResult = yield* createAccount(
        lucid,
        accountConfig,
      );
      const createAccountSigned = yield* Effect.promise(() =>
        createAccountResult.sign.withWallet().complete()
      );
      const createAccountHash = yield* Effect.promise(() =>
        createAccountSigned.submit()
      );

      console.log("TxHash: ", createAccountHash);
      yield* Effect.log(`TxHash: ${createAccountHash}`);

      return createAccountHash;
    });

    const createAccountResult = yield* createAccountFlow.pipe(
      Effect.tapError((error) =>
        Effect.log(`Error creating Account: ${error}`)
      ),
      Effect.map((hash) => {
        console.log("Account created successfully. TxHash:", hash);
        return hash;
      }),
    );

    yield* Effect.sync(() => emulator.awaitBlock(100));

    const [subscriberUTxOs, accountUTxOs] = yield* Effect.all([
      Effect.promise(() => lucid.utxosAt(users.subscriber.address)),
      Effect.promise(() => lucid.utxosAt(accountAddress)),
    ]);

    yield* Console.log("Updated- Subscriber Utxos:", subscriberUTxOs);
    yield* Console.log(
      "Updated- Account Validator Utxos:",
      accountUTxOs,
    );

    return {
      txHash: createAccountResult,
      accountConfig,
      outputs: {
        subscriberUTxOs,
        accountUTxOs,
      },
    };
  });
};

test<LucidContext>("Test 1 - Create Account", async (context) => {
  const result = await Effect.runPromise(createAccountTestCase(context));
  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");
  // console.log("Create Account with transaction hash:", result);

  expect(result.accountConfig).toBeDefined();
  expect(result.outputs).toBeDefined();
  // expect(result.additionalInfo.paymentValidatorAddress).toBeDefined();
});
