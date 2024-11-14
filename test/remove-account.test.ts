import { removeAccount, RemoveAccountConfig } from "../src/index.js";
import { expect, test } from "vitest";
import { Address, validatorToAddress } from "@lucid-evolution/lucid";
import { Effect } from "effect";
import { LucidContext, makeLucidContext } from "./service/lucidContext.js";
import { createAccountTestCase } from "./createAccountTestCase.js";
import { accountScript, accountValidator } from "./common/constants.js";

type RemoveAccountResult = {
    txHash: string;
};

export const removeAccountTestCase = (
    { lucid, users, emulator }: LucidContext,
): Effect.Effect<RemoveAccountResult, Error, never> => {
    return Effect.gen(function* () {
        const network = lucid.config().network;
        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
        // let accountAddress: Address;

        const accountAddress: Address = validatorToAddress(
            network,
            accountValidator.mintAccount,
        );
        if (emulator && lucid.config().network === "Custom") {
            const createAccountResult = yield* createAccountTestCase({
                lucid,
                users,
                emulator,
            });

            expect(createAccountResult).toBeDefined();
            expect(typeof createAccountResult.txHash).toBe("string"); // Assuming the createAccountResult is a transaction hash
            yield* Effect.sync(() => emulator.awaitBlock(10));
        } else {
            // accountAddress = validatorToAddress(
            //     "Preprod",
            //     accountValidator.mintAccount,
            // );
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
        const context = yield* (makeLucidContext());
        const result = yield* removeAccountTestCase(context);
        return result;
    });
    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
});
