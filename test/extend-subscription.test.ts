import {
    ADA,
    createAccount,
    CreateAccountConfig,
    CreateServiceConfig,
    Emulator,
    ExtendPaymentConfig,
    extendSubscription,
    fromAssets,
    generateEmulatorAccount,
    getValidatorDatum,
    initiateSubscription,
    InitPaymentConfig,
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
import { Console, Effect, pipe } from "effect";
import { toText } from "@lucid-evolution/lucid";
import {
    findCip68TokenNames,
    tokenNameFromUTxO,
} from "../src/core/utils/assets.js";
import { initiateSubscriptionTestCase } from "./initiate-subscription.test.js";

type LucidContext = {
    lucid: LucidEvolution;
    users: any;
    emulator: Emulator;
};

// INITIALIZE EMULATOR + ACCOUNTS
beforeEach<LucidContext>(async (context) => {
    context.users = {
        subscriber: generateEmulatorAccount({
            lovelace: BigInt(100_000_000),
        }),
        merchant: generateEmulatorAccount({
            lovelace: BigInt(100_000_000),
        }),
    };

    context.emulator = new Emulator([
        context.users.subscriber,
        context.users.merchant,
    ]);

    context.lucid = await Lucid(context.emulator, "Custom");
});

test<LucidContext>("Test 1 - Extend Service", async (
    { lucid, users, emulator }: LucidContext,
) => {
    const program = Effect.gen(function* () {
        const initResult = yield* initiateSubscriptionTestCase({
            lucid,
            users,
            emulator,
        });
        emulator.awaitBlock(100);

        expect(initResult).toBeDefined();
        expect(typeof initResult.txHash).toBe("string"); // Assuming the initResult is a transaction hash
        console.log(
            "Subscription initiated with transaction hash:",
            initResult.txHash,
        );

        const paymentUTxO = yield* Effect.promise(() =>
            lucid.utxosAt(initResult.additionalInfo.paymentValidatorAddress)
        );
        console.log(
            "PAYMENT UTXO:",
            paymentUTxO,
        );

        const paymentValidator = readMultiValidators(true, [
            initResult.paymentConfig.service_policyId,
            initResult.paymentConfig.account_policyId,
        ]);

        const paymentPolicyId = mintingPolicyToId(
            paymentValidator.mintPayment,
        );

        const payment_token_name = tokenNameFromUTxO(
            paymentUTxO[0],
            paymentPolicyId,
        );

        const paymentNFT = toUnit(
            paymentPolicyId,
            payment_token_name, //tokenNameWithoutFunc,
        );

        // console.log(
        //     "paymentUTxO2 UTxO:",
        //     paymentUTxO2,
        // );

        console.log(
            "initResult.paymentConfig.account_nft_tn:",
            initResult.paymentConfig.account_nft_tn,
        );

        let extension_period = initResult.paymentConfig.interval_length;
        let extension_fee = initResult.paymentConfig.interval_amount;
        let extension_intervals = BigInt(1);

        // Calculate new subscription end time
        const currentTime = BigInt(emulator.now());
        const newSubscriptionEnd = currentTime +
            (extension_period * extension_intervals);

        const extendPaymentConfig: ExtendPaymentConfig = {
            ...initResult.paymentConfig,
            subscription_start: currentTime,
            subscription_end: newSubscriptionEnd,
            total_subscription_fee: extension_fee * extension_intervals,
            num_intervals: extension_intervals,
            interval_length: extension_period,
            interval_amount: extension_fee,
            user_token: initResult.additionalInfo.accUsrNft,
            service_ref_token: initResult.additionalInfo.servcRefNft,
            payment_token: paymentNFT,
            paymentUtxo: paymentUTxO,
        };

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        const extendResult = yield* extendSubscription(
            lucid,
            extendPaymentConfig,
        );
        const extendSigned = yield* Effect.promise(() =>
            extendResult.sign.withWallet().complete()
        );
        const extendTxHash = yield* Effect.promise(() => extendSigned.submit());

        console.log(
            "Subscription extended with transaction hash:",
            extendTxHash,
        );
        yield* Effect.sync(() => emulator.awaitBlock(100));

        const extendSubscriberUTxO = yield* Effect.promise(() =>
            lucid.utxosAt(users.subscriber.address)
        );

        yield* Effect.log("removeSubscriberUTxO: After:", extendSubscriberUTxO);

        return {
            initTxHash: initResult.txHash,
            extendTxHash,
            extendedConfig: extendPaymentConfig,
        };
    });
    const result = await Effect.runPromise(program);

    expect(result.initTxHash).toBeDefined();
    expect(result.extendTxHash).toBeDefined();
    expect(typeof result.initTxHash).toBe("string");
    expect(typeof result.extendTxHash).toBe("string");

    // Add assertions to verify the extended configuration
    expect(result.extendedConfig.subscription_start).toBeGreaterThan(
        result.extendedConfig.subscription_end,
    );
    expect(result.extendedConfig.total_subscription_fee).toBe(
        result.extendedConfig.interval_amount *
            result.extendedConfig.num_intervals,
    );
    expect(result.extendedConfig.num_intervals).toBe(1n);
});
