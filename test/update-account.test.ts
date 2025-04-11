import { UpdateAccountConfig, updateAccountProgram } from "../src/index.js";
import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext } from "./service/lucidContext.js";
import { AccountSetup, setupAccount, setupBase } from "./setupTest.js";

type RemoveServiceResult = {
    txHash: string;
    updateAccountConfig: UpdateAccountConfig;
};

export const updateAccountTestCase = (
    setupResult: AccountSetup,
): Effect.Effect<RemoveServiceResult, Error, never> => {
    return Effect.gen(function* () {
        const {
            context: { lucid, users },
            subscriberNftTn,
            accountNftTn,
        } = setupResult;

        const updateAccountConfig: UpdateAccountConfig = {
            new_email: "new_business@web3.ada",
            new_phone: "(288) 481-2686-999",
            account_nft_tn: accountNftTn,
            subscriber_nft_tn: subscriberNftTn,
        };

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
        const updateAccountFlow = Effect.gen(function* (_) {
            const updateAccountResult = yield* updateAccountProgram(lucid, updateAccountConfig)
            const updateAccountSigned = yield* Effect.promise(() =>
                updateAccountResult.sign
                    .withWallet()
                    .complete()
            );
            const updateAccountHash = yield* Effect.promise(() => updateAccountSigned.submit());
            return updateAccountHash;
        });

        const updateAccountResult = yield* updateAccountFlow.pipe(
            Effect.tapError((error) => Effect.log(`Error updating Account: ${error}`)),
            Effect.map((hash) => {
                return hash;
            }),
        );

        return {
            txHash: updateAccountResult,
            updateAccountConfig,
        };
    });
};

test<LucidContext>("Test 5 - Update Account", async () => {
    const program = Effect.gen(function* () {
        const base = yield* setupBase();

        const setupContext = yield* setupAccount(base);
        const result = yield* updateAccountTestCase(setupContext);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
    expect(result.updateAccountConfig).toBeDefined();
});
