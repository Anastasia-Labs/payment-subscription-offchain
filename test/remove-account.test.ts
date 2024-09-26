import {
    ADA,
    createAccount,
    CreateAccountConfig,
    Emulator,
    generateEmulatorAccount,
    Lucid,
    LucidEvolution,
    removeAccount,
    RemoveAccountConfig,
    sendTokenToAccount,
    sendTokenToService,
    toUnit,
    UpdateAccountConfig,
    UpdateServiceConfig,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import { mintingPolicyToId, validatorToAddress } from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect, pipe } from "effect";
import { toText } from "@lucid-evolution/lucid";
import { findCip68TokenNames } from "../src/core/utils/assets.js";

type LucidContext = {
    lucid: LucidEvolution;
    users: any;
    emulator: Emulator;
};

const accountValidator = readMultiValidators(false, []);
const accountPolicyId = mintingPolicyToId(accountValidator.mintAccount);

// INITIALIZE EMULATOR + ACCOUNTS
beforeEach<LucidContext>(async (context) => {
    context.users = {
        subscriber: generateEmulatorAccount({
            lovelace: BigInt(100_000_000),
        }),
    };

    context.emulator = new Emulator([
        context.users.subscriber,
    ]);

    context.lucid = await Lucid(context.emulator, "Custom");
});

test<LucidContext>("Test 1 - Remove Account", async ({
    lucid,
    users,
    emulator,
}) => {
    const program = Effect.gen(function* () {
        yield* Effect.log("Remove Subscription Account...TEST!!!!");

        const accountScript = {
            spending: accountValidator.spendAccount.script,
            minting: accountValidator.mintAccount.script,
            staking: "",
        };

        const createAccountConfig: CreateAccountConfig = {
            email: "business@web3.ada",
            phone: "288-481-2686",
            account_created: BigInt(emulator.now()),
            scripts: accountScript,
        };

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        const subscriberUTxO = yield* Effect.promise(() =>
            lucid.utxosAt(users.subscriber.address)
        );

        yield* Effect.log("subscriberAddress: ", users.subscriber.address);
        yield* Effect.log(
            "subscriberUTxOs before transaction: ",
            subscriberUTxO,
        );

        try {
            const createAccountUnSigned = yield* createAccount(
                lucid,
                createAccountConfig,
            );
            const createAccountSigned = yield* Effect.promise(() =>
                createAccountUnSigned.sign.withWallet().complete()
            );

            const createAccountHash = yield* Effect.promise(() =>
                createAccountSigned.submit()
            );
            yield* Effect.log("TxHash: ", createAccountHash);
        } catch (error) {
            console.error("Error updating service:", error);
            throw error;
        }

        yield* Effect.sync(() => emulator.awaitBlock(100));

        const subscriberUTxOAfter = yield* Effect.promise(() =>
            lucid.utxosAt(users.subscriber.address)
        );

        yield* Effect.log(
            "subscriberAddress: After: ",
            users.subscriber.address,
        );
        yield* Effect.log("subscriberUTxO: After:", subscriberUTxOAfter);

        const accountScriptAddress = validatorToAddress(
            "Custom",
            accountValidator.spendAccount,
        );
        const accountUTxO = yield* Effect.promise(() =>
            lucid.utxosAt(accountScriptAddress)
        );

        yield* Effect.log("Validator utxos", accountUTxO);

        emulator.awaitBlock(100);
        yield* Effect.log(
            "REMOVING///////////////////////////>>>>>>>>>>>>>>>>>>",
            accountUTxO,
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
            email: "business@web3.ada",
            phone: "288 481-2686",
            account_created: createAccountConfig.account_created,
            user_token: userNft,
            ref_token: refNft,
            scripts: accountScript,
        };

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        try {
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
            yield* Effect.log("TxHash: ", removeAccountHash);
        } catch (error) {
            console.error("Error updating service:", error);
            throw error; // or handle it as appropriate for your test
        }
        yield* Effect.sync(() => emulator.awaitBlock(100));

        const removeSubscriberUTxO = yield* Effect.promise(() =>
            lucid.utxosAt(users.subscriber.address)
        );

        yield* Effect.log("removeSubscriberUTxO: After:", removeSubscriberUTxO);

        const scriptUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(accountScriptAddress)
        );

        yield* Effect.log("Updated Service Validator: UTxOs", scriptUTxOs);
    });
    await Effect.runPromise(program);
});
