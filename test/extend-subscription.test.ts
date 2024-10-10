import {
    ExtendPaymentConfig,
    extendSubscription,
    toUnit,
} from "../src/index.js";
import { expect, test } from "vitest";
import { mintingPolicyToId } from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { tokenNameFromUTxO } from "../src/core/utils/assets.js";
import { initiateSubscriptionTestCase } from "./initiate-subscription.test.js";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { LucidContext, makeLucidContext } from "./emulator/service.js";

type ExtendSubscriptionResult = {
    txHash: string;
    extendedConfig: ExtendPaymentConfig;
};

export const extendSubscriptionTestCase = (
    { lucid, users, emulator }: LucidContext,
): Effect.Effect<ExtendSubscriptionResult, Error, never> => {
    return Effect.gen(function* () {
        const initResult = yield* initiateSubscriptionTestCase({
            lucid,
            users,
            emulator,
        });

        expect(initResult).toBeDefined();
        expect(typeof initResult.txHash).toBe("string"); // Assuming the initResult is a transaction hash

        yield* Effect.sync(() => emulator.awaitBlock(100));

        const paymentValidator = readMultiValidators(blueprint, true, [
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
        const extendPaymentFlow = Effect.gen(function* (_) {
            const extendResult = yield* extendSubscription(
                lucid,
                extendPaymentConfig,
            );
            const extendSigned = yield* Effect.promise(() =>
                extendResult.sign.withWallet().complete()
            );

            const extendTxHash = yield* Effect.promise(() =>
                extendSigned.submit()
            );

            yield* Effect.sync(() => emulator.awaitBlock(100));

            return extendTxHash;
        });

        const extendPaymentResult = yield* extendPaymentFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error creating Account: ${error}`)
            ),
            Effect.map((hash) => {
                return hash;
            }),
        );

        return {
            txHash: extendPaymentResult,
            extendedConfig: extendPaymentConfig,
        };
    });
};

test<LucidContext>("Test 1 - Extend Service", async () => {
    const program = Effect.gen(function* ($) {
        const context = yield* makeLucidContext;
        const result = yield* extendSubscriptionTestCase(context);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");

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
