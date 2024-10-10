import {
  createAccount,
  CreateAccountConfig,
  UTxO,
  validatorToAddress,
} from "../src/index.js";
import { expect, test } from "vitest";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { LucidContext, makeLucidContext } from "./emulator/service.js";

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
    const accountValidator = readMultiValidators(blueprint, false, []);

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

      return createAccountHash;
    });

    const createAccountResult = yield* createAccountFlow.pipe(
      Effect.tapError((error) =>
        Effect.log(`Error creating Account: ${error}`)
      ),
      Effect.map((hash) => {
        return hash;
      }),
    );

    yield* Effect.sync(() => emulator.awaitBlock(50));

    const [subscriberUTxOs, accountUTxOs] = yield* Effect.all([
      Effect.promise(() => lucid.utxosAt(users.subscriber.address)),
      Effect.promise(() => lucid.utxosAt(accountAddress)),
    ]);

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

test<LucidContext>("Test 1 - Create Account", async () => {
  const program = Effect.gen(function* ($) {
    const context = yield* makeLucidContext;
    const result = yield* createAccountTestCase(context);
    return result;
  });

  const result = await Effect.runPromise(program);

  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");
  expect(result.accountConfig).toBeDefined();
  expect(result.outputs).toBeDefined();
});
