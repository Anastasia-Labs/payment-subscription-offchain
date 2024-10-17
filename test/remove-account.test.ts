import { removeAccount, RemoveAccountConfig, toUnit } from "../src/index.js";
import { beforeAll, expect, test } from "vitest";
import {
    Address,
    mintingPolicyToId,
    validatorToAddress,
} from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
// import { findCip68TokenNames } from "../src/core/utils/assets.js";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import {
    LucidContext,
    makeEmulatorContext,
    makeLucidContext,
} from "./emulator/service.js";
import { extractTokens, getValidatorDatum } from "../src/endpoints/utils.js";
import { createAccountTestCase } from "./createAccountTestCase.js";

const accountValidator = readMultiValidators(blueprint, false, []);
const accountPolicyId = mintingPolicyToId(accountValidator.mintAccount);

const accountScript = {
    spending: accountValidator.spendAccount.script,
    minting: accountValidator.mintAccount.script,
    staking: "",
};

type RemoveAccountResult = {
    txHash: string;
};

export const removeAccountTestCase = (
    { lucid, users, emulator }: LucidContext,
): Effect.Effect<RemoveAccountResult, Error, never> => {
    return Effect.gen(function* () {
        // let removeAccountConfig: RemoveAccountConfig;
        let accountAddress: Address;
        if (emulator && lucid.config().network === "Custom") {
            const createAccountResult = yield* createAccountTestCase({
                lucid,
                users,
                emulator,
            });

            expect(createAccountResult).toBeDefined();
            expect(typeof createAccountResult.txHash).toBe("string"); // Assuming the createAccountResult is a transaction hash
            yield* Effect.sync(() => emulator.awaitBlock(50));
            lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

            accountAddress = validatorToAddress(
                "Custom",
                accountValidator.mintAccount,
            );
        } else {
            accountAddress = validatorToAddress(
                "Preprod",
                accountValidator.mintAccount,
            );
        }
        // console.log("Provider: ", lucid.config().provider);
        const accountUTxOs = yield* Effect.promise(() =>
            lucid.config().provider.getUtxos(accountAddress)
        );

        const subscriberAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );

        const subscriberUTxOs = yield* Effect.promise(() =>
            lucid.config().provider.getUtxos(subscriberAddress)
        );

        // console.log("Address: ", subscriberAddress);
        // console.log("subscriberUTxOs: ", subscriberUTxOs);
        // console.log("Account Address: ", accountAddress);
        // console.log("AccountUTxOs: ", accountUTxOs);

        const removeAccountConfig: RemoveAccountConfig = {
            scripts: accountScript,
        };

        console.log("Provider: ", lucid.config().provider);
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

            // console.log("CBOR: ", removeAccountResult.toCBOR());
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
        };
    });
};

test("Test 1 - Remove Account", async () => {
    const program = Effect.gen(function* () {
        const context = yield* (makeLucidContext("Preprod"));
        const result = yield* removeAccountTestCase(context);
        return result;
    });
    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
});
