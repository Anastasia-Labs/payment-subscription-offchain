import { updateAccount, UpdateAccountConfig } from "../src/index.js";
import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext } from "./service/lucidContext.js";
import { accountPolicyId, accountScript } from "./common/constants.js";
import { SetupResult, setupTest } from "./setupTest.js";

type RemoveServiceResult = {
    txHash: string;
    updateAccountConfig: UpdateAccountConfig;
};

export const updateAccountTestCase = (
    setupResult: SetupResult,
): Effect.Effect<RemoveServiceResult, Error, never> => {
    return Effect.gen(function* () {
        const {
            context: { lucid, users },
            accRefName,
            accUserName,
        } = setupResult;

        const updateAccountConfig: UpdateAccountConfig = {
            account_policy_Id: accountPolicyId,
            account_ref_name: accRefName,
            account_usr_name: accUserName,
            scripts: accountScript,
        };

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
        const updateAccountFlow = Effect.gen(function* (_) {
            const updateAccountResult = yield* Effect.promise(() =>
                Effect.runPromise(
                    updateAccount(lucid, updateAccountConfig),
                )
            );
            const updateAccountSigned = yield* Effect.promise(() =>
                updateAccountResult.sign
                    .withWallet()
                    .complete()
            );
            const updateAccountHash = yield* Effect.promise(() =>
                updateAccountSigned.submit()
            );
            return updateAccountHash;
        });

        const updateAccountResult = yield* updateAccountFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error updating Account: ${error}`)
            ),
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

test<LucidContext>("Test 1 - Update Account", async () => {
    const program = Effect.gen(function* () {
        const setupContext = yield* setupTest();
        const result = yield* updateAccountTestCase(setupContext);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
    expect(result.updateAccountConfig).toBeDefined();
});
