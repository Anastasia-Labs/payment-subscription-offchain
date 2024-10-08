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

        expect(initResult).toBeDefined();
        expect(typeof initResult.txHash).toBe("string"); // Assuming the initResult is a transaction hash
        console.log(
            "Subscription initiated with transaction hash:",
            initResult.txHash,
        );

        yield* Effect.sync(() => emulator.awaitBlock(100));
        console.log("Extend Subscription Service...TEST!!!!");

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
            initResult.outputs.paymentValidatorUTxOs,
            paymentPolicyId,
        );

        const paymentNFT = toUnit(
            paymentPolicyId,
            payment_token_name, //tokenNameWithoutFunc,
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

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        const extendPaymentConfig: ExtendPaymentConfig = {
            ...initResult.paymentConfig,
            subscription_start: currentTime,
            subscription_end: newSubscriptionEnd,
            total_subscription_fee: newTotalSubscriptionFee,
            num_intervals: newNumIntervals,
            interval_length: initResult.paymentConfig.interval_length,
            interval_amount: interval_amount,
            user_token: initResult.paymentConfig.account_user_token,
            service_ref_token: initResult.paymentConfig.service_ref_token,
            payment_token: paymentNFT,
            scripts: paymentScript,
            subscriberUTxO: initResult.outputs.subscriberUTxOs,
            paymentUTxO: initResult.outputs.paymentValidatorUTxOs,
        };

        const extendResult = yield* extendSubscription(
            lucid,
            extendPaymentConfig,
        );
        const extendSigned = yield* Effect.promise(() =>
            extendResult.sign.withWallet().complete()
        );

        const extendTxHash = yield* Effect.promise(() => extendSigned.submit());

        yield* Effect.sync(() => emulator.awaitBlock(100));

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
