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
import { createAccountTestCase } from "./create-account.test.js";

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
        const createAccountResult = yield* createAccountTestCase({
            lucid,
            users,
            emulator,
        });

        expect(createAccountResult).toBeDefined();
        expect(typeof createAccountResult.txHash).toBe("string"); // Assuming the createAccountResult is a transaction hash
        console.log(
            "Create account with transaction hash:",
            createAccountResult.txHash,
        );

        yield* Effect.log("Remove Subscription Account...TEST!!!!");

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
            ...createAccountResult.accountConfig,
            email: "business@web3.ada",
            phone: "288 481-2686",
            user_token: userNft,
            ref_token: refNft,
        };

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
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
