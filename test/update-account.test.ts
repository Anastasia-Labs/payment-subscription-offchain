import { toUnit, updateAccount, UpdateAccountConfig } from "../src/index.js";
import { expect, test } from "vitest";
import { mintingPolicyToId, validatorToAddress } from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { findCip68TokenNames } from "../src/core/utils/assets.js";
import { createAccountTestCase } from "./create-account.test.js";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { LucidContext, makeEmulatorContext } from "./emulator/service.js";

type RemoveServiceResult = {
    txHash: string;
    updateAccountConfig: UpdateAccountConfig;
};

const accountValidator = readMultiValidators(blueprint, false, []);
const accountPolicyId = mintingPolicyToId(accountValidator.mintAccount);

export const updateAccountTestCase = (
    { lucid, users, emulator }: LucidContext,
): Effect.Effect<RemoveServiceResult, Error, never> => {
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
            lucid.utxosAt(
                users.subscriber.address,
            )
        );

        const accountScriptAddress = validatorToAddress(
            "Custom",
            accountValidator.spendAccount,
        );

        const accountUTxO = yield* Effect.promise(() =>
            lucid.utxosAt(accountScriptAddress)
        );

        yield* Effect.sync(() => emulator.awaitBlock(100));

        const cip68TokenNames = findCip68TokenNames(
            [...accountUTxO, ...subscriberUTxOAfter],
            accountPolicyId,
        );
        const { refTokenName, userTokenName } = cip68TokenNames;

        const refNft = toUnit(
            accountPolicyId,
            refTokenName,
        );

        const userNft = toUnit(
            accountPolicyId,
            userTokenName,
        );

        const updateAccountConfig: UpdateAccountConfig = {
            ...createAccountResult.accountConfig,
            new_email: "new_business@web3.ada",
            new_phone: "(288) 481-2686",
            user_token: userNft,
            ref_token: refNft,
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

        yield* Effect.sync(() => emulator.awaitBlock(50));

        return {
            txHash: updateAccountResult,
            updateAccountConfig,
        };
    });
};

test<LucidContext>("Test 1 - Update Account", async () => {
    const program = Effect.gen(function* () {
        const context = yield* makeEmulatorContext;
        const result = yield* updateAccountTestCase(context);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
    expect(result.updateAccountConfig).toBeDefined();
});
