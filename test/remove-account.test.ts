import { removeAccount, RemoveAccountConfig, toUnit } from "../src/index.js";
import { expect, test } from "vitest";
import { mintingPolicyToId, validatorToAddress } from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { findCip68TokenNames } from "../src/core/utils/assets.js";
import { createAccountTestCase } from "./create-account.test.js";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { LucidContext, makeLucidContext } from "./emulator/service.js";

const accountValidator = readMultiValidators(blueprint, false, []);
const accountPolicyId = mintingPolicyToId(accountValidator.mintAccount);

type RemoveAccountResult = {
    txHash: string;
    removeAccountConfig: RemoveAccountConfig;
};

export const removeAccountTestCase = (
    { lucid, users, emulator }: LucidContext,
): Effect.Effect<RemoveAccountResult, Error, never> => {
    return Effect.gen(function* () {
        const createAccountResult = yield* createAccountTestCase({
            lucid,
            users,
            emulator,
        });

        expect(createAccountResult).toBeDefined();
        expect(typeof createAccountResult.txHash).toBe("string"); // Assuming the createAccountResult is a transaction hash

        yield* Effect.sync(() => emulator.awaitBlock(100));

        const subscriberUTxOAfter = yield* Effect.promise(() =>
            lucid.utxosAt(users.subscriber.address)
        );

        const accountScriptAddress = validatorToAddress(
            "Custom",
            accountValidator.spendAccount,
        );
        const accountUTxO = yield* Effect.promise(() =>
            lucid.utxosAt(accountScriptAddress)
        );

        // Find the token names
        const { refTokenName, userTokenName } = findCip68TokenNames([
            ...accountUTxO,
            ...subscriberUTxOAfter,
        ], accountPolicyId);

        const refNft = toUnit(
            accountPolicyId,
            refTokenName,
        );

        const userNft = toUnit(
            accountPolicyId,
            userTokenName,
        );

        const removeAccountConfig: RemoveAccountConfig = {
            ...createAccountResult.accountConfig,
            email: "business@web3.ada",
            phone: "288 481-2686",
            user_token: userNft,
            ref_token: refNft,
        };

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
        const removeAccountFlow = Effect.gen(function* (_) {
            const removeAccountResult = yield* removeAccount(
                lucid,
                removeAccountConfig,
            );
            const removeAccountSigned = yield* Effect.promise(() =>
                removeAccountResult.sign
                    .withWallet()
                    .complete()
            );
            const removeAccountHash = yield* Effect.promise(() =>
                removeAccountSigned.submit()
            );

            return removeAccountHash;
        });

        const removeAccountResult = yield* removeAccountFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error creating Account: ${error}`)
            ),
            Effect.map((hash) => {
                return hash;
            }),
        );

        return {
            txHash: removeAccountResult,
            removeAccountConfig,
        };
    });
};

test<LucidContext>("Test 1 - Remove Account", async () => {
    const program = Effect.gen(function* () {
        const context = yield* makeLucidContext;
        const result = yield* removeAccountTestCase(context);
        return result;
    });
    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
    expect(result.removeAccountConfig).toBeDefined();
});
