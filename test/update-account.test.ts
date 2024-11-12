import { updateAccount, UpdateAccountConfig } from "../src/index.js";
import { expect, test } from "vitest";
import {
    Address,
    mintingPolicyToId,
    validatorToAddress,
} from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { LucidContext, makeLucidContext } from "./service/lucidContext.js";
import { createAccountTestCase } from "./createAccountTestCase.js";
import { getAccountValidatorDatum } from "../src/endpoints/utils.js";

type RemoveServiceResult = {
    txHash: string;
    updateAccountConfig: UpdateAccountConfig;
};

const accountValidator = readMultiValidators(blueprint, false, []);
const accountPolicyId = mintingPolicyToId(accountValidator.mintAccount);

const accountScript = {
    spending: accountValidator.spendAccount.script,
    minting: accountValidator.mintAccount.script,
    staking: "",
};

export const updateAccountTestCase = (
    { lucid, users, emulator }: LucidContext,
): Effect.Effect<RemoveServiceResult, Error, never> => {
    return Effect.gen(function* () {
        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
        let accountAddress: Address;

        if (emulator && lucid.config().network === "Custom") {
            const createAccountResult = yield* createAccountTestCase({
                lucid,
                users,
                emulator,
            });

            expect(createAccountResult).toBeDefined();
            expect(typeof createAccountResult.txHash).toBe("string"); // Assuming the createAccountResult is a transaction hash

            yield* Effect.sync(() => emulator.awaitBlock(10));

            accountAddress = validatorToAddress(
                "Custom",
                accountValidator.spendAccount,
            );
        } else {
            accountAddress = validatorToAddress(
                "Preprod",
                accountValidator.mintAccount,
            );
        }

        // const subscriberAddress: Address = yield* Effect.promise(() =>
        //     lucid.wallet().address()
        // );

        // const subscriberUTxOs = yield* Effect.promise(() =>
        //     lucid.utxosAt(subscriberAddress)
        // );

        const accountUTxOs = yield* Effect.promise(() =>
            lucid.config().provider.getUtxos(accountAddress)
        );

        const accountData = yield* Effect.promise(
            () => (getAccountValidatorDatum(accountUTxOs)),
        );

        // console.log("Address: ", subscriberAddress);
        // console.log("subscriberUTxOs: ", subscriberUTxOs);
        // console.log("Account Address: ", accountAddress);
        // console.log("AccountUTxOs: ", accountUTxOs);
        // console.log("accountData: ", accountData);

        const updateAccountConfig: UpdateAccountConfig = {
            new_email: "new_business@web3.ada",
            new_phone: "(288) 481-2686-999",
            account_created: accountData[0].account_created,
            scripts: accountScript,
        };

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

        // if (emulator) {
        //     yield* Effect.sync(() => emulator.awaitBlock(100));

        //     const subscriberAddress: Address = yield* Effect.promise(() =>
        //         lucid.wallet().address()
        //     );

        //     const subscriberUTxOs = yield* Effect.promise(() =>
        //         lucid.utxosAt(subscriberAddress)
        //     );

        //     const accountUTxOs = yield* Effect.promise(() =>
        //         lucid.config().provider.getUtxos(accountAddress)
        //     );

        //     const accountData = yield* Effect.promise(
        //         () => (getValidatorDatum(accountUTxOs)),
        //     );
        //     console.log("Address: ", subscriberAddress);
        //     console.log("subscriberUTxOs After: ", subscriberUTxOs);
        //     console.log("Account Address After: ", accountAddress);
        //     console.log("AccountUTxOs After: ", accountUTxOs);
        //     console.log("AccountData After: ", accountData);
        // }

        return {
            txHash: updateAccountResult,
            updateAccountConfig,
        };
    });
};

test<LucidContext>("Test 1 - Update Account", async () => {
    const program = Effect.gen(function* () {
        const context = yield* makeLucidContext("Preprod");
        const result = yield* updateAccountTestCase(context);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
    expect(result.updateAccountConfig).toBeDefined();
});
