import {
    Emulator,
    ExtendPaymentConfig,
    extendSubscription,
    generateEmulatorAccount,
    Lucid,
    LucidEvolution,
    toUnit,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import {
    mintingPolicyToId,
    PROTOCOL_PARAMETERS_DEFAULT,
} from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { tokenNameFromUTxO } from "../src/core/utils/assets.js";
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
    ], { ...PROTOCOL_PARAMETERS_DEFAULT, maxTxSize: 19000 });

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
        // emulator.awaitBlock(100);

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

        const paymentScript = {
            spending: paymentValidator.spendPayment.script,
            minting: paymentValidator.mintPayment.script,
            staking: "",
        };

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

        const extension_intervals = BigInt(1); // Number of intervals to extend
        const interval_amount = initResult.paymentConfig.interval_amount *
            extension_intervals;
        const newTotalSubscriptionFee =
            initResult.paymentConfig.total_subscription_fee +
            (interval_amount * extension_intervals);
        const newNumIntervals = initResult.paymentConfig.num_intervals +
            extension_intervals;
        const extension_period = initResult.paymentConfig.interval_length *
            extension_intervals;

        const newSubscriptionEnd = initResult.paymentConfig.subscription_end +
            extension_period;

        // Calculate new subscription end time
        const currentTime = BigInt(emulator.now());

        console.log(
            "newNumIntervals:",
            newNumIntervals,
        );

        console.log(
            "sub_end:",
            initResult.paymentConfig.subscription_end,
        );

        console.log(
            "interval_length:",
            initResult.paymentConfig.interval_length,
        );
        console.log(
            "interval_amount:",
            interval_amount,
        );
        console.log(
            "newSubscriptionEnd:",
            newSubscriptionEnd,
        );

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        const extendPaymentConfig: ExtendPaymentConfig = {
            ...initResult.paymentConfig,
            subscription_start: currentTime,
            subscription_end: newSubscriptionEnd,
            total_subscription_fee: newTotalSubscriptionFee,
            num_intervals: newNumIntervals,
            interval_length: initResult.paymentConfig.interval_length,
            interval_amount: interval_amount,
            user_token: initResult.additionalInfo.accUsrNft,
            service_ref_token: initResult.additionalInfo.servcRefNft,
            payment_token: paymentNFT,
            scripts: paymentScript,
            accountUtxo: initResult.additionalInfo.subscriberUtxos,
            paymentUtxo: paymentUTxO,
        };

        console.log(
            "ExtendPaymentConfig:",
            extendPaymentConfig,
        );

        const extendResult = yield* extendSubscription(
            lucid,
            extendPaymentConfig,
        );
        const extendSigned = yield* Effect.promise(() =>
            extendResult.sign.withWallet().complete()
        );
        console.log(
            "We reach here....",
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
    expect(result.extendedConfig.subscription_end).toBeGreaterThan(
        result.extendedConfig.subscription_start,
    );
    expect(result.extendedConfig.total_subscription_fee).toBe(
        result.extendedConfig.interval_amount *
            result.extendedConfig.num_intervals,
    );
    expect(result.extendedConfig.num_intervals).toBe(13n);
});
