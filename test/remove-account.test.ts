import { RemoveAccountConfig, removeAccountProgram } from "../src/index.js";
import { expect, test } from "vitest";
import { Effect } from "effect";
import { createAccountTestCase } from "./createAccountTestCase.js";
import {
  AccountSetup,
  setupAccount,
  setupBase,
} from "./setupTest.js";

type RemoveAccountResult = {
  txHash: string;
};

export const removeAccountTestCase = (
  setupResult: AccountSetup,
): Effect.Effect<RemoveAccountResult, Error, never> => {
  return Effect.gen(function* () {
    const {
      context: { lucid, users, emulator },
      accountNftTn,
      subscriberNftTn,
    } = setupResult;

    lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

    if (emulator && lucid.config().network === "Custom") {
      const createAccountResult = yield* createAccountTestCase({
        lucid,
        users,
        emulator,
      });

      expect(createAccountResult).toBeDefined();
      expect(typeof createAccountResult.txHash).toBe("string");
      yield* Effect.sync(() => emulator.awaitBlock(10));
    }

    const removeAccountConfig: RemoveAccountConfig = {
      account_nft_tn: accountNftTn,
      subscriber_nft_tn: subscriberNftTn,
    };

    const removeAccountFlow = Effect.gen(function* (_) {
      const removeAccountUnsigned = yield* removeAccountProgram(lucid, removeAccountConfig);
      const removeAccountSigned = yield* Effect.promise(() => removeAccountUnsigned.sign.withWallet().complete());

      const removeAccountHash = yield* Effect.promise(() => removeAccountSigned.submit());
      return removeAccountHash;
    });

    const removeAccountResult = yield* removeAccountFlow.pipe(
      Effect.tapError((error) => Effect.log(`Error creating Account: ${error}`)),
      Effect.map((hash) => {
        return hash;
      }),
    );

    return {
      txHash: removeAccountResult,
    };
  });
};

test("Test 6 - Remove Account", async () => {
  const program = Effect.gen(function* () {
    const base = yield* setupBase();
    const setupContext = yield* setupAccount(base);
    const result = yield* removeAccountTestCase(setupContext);
    return result;
  });
  const result = await Effect.runPromise(program);

  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");
});
