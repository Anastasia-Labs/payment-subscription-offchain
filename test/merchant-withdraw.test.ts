import {
    merchantWithdraw,
    MerchantWithdrawConfig,
    toUnit,
} from "../src/index.js";
import { expect, test } from "vitest";
import { mintingPolicyToId } from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { tokenNameFromUTxO } from "../src/core/utils/assets.js";
import { initiateSubscriptionTestCase } from "./initiate-subscription.test.js";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { LucidContext, makeEmulatorContext } from "./emulator/service.js";

type MerchantWithdrawResult = {
    txHash: string;
    withdrawConfig: MerchantWithdrawConfig;
};

export const merchantWithdrawTestCase = (
    { lucid, users, emulator }: LucidContext,
): Effect.Effect<MerchantWithdrawResult, Error, never> => {
    return Effect.gen(function* () {
        const initResult = yield* initiateSubscriptionTestCase({
            lucid,
            users,
            emulator,
        });

        expect(initResult).toBeDefined();
        expect(typeof initResult.txHash).toBe("string"); // Assuming the initResult is a transaction hash

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

        lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

        const merchantWithdrawConfig: MerchantWithdrawConfig = {
            ...initResult.paymentConfig,
            subscription_start: currentTime,
            subscription_end: newSubscriptionEnd,
            total_subscription_fee: newTotalSubscriptionFee,
            num_intervals: newNumIntervals,
            last_claimed: currentTime,
            interval_length: initResult.paymentConfig.interval_length,
            interval_amount: interval_amount,
            merchant_token: initResult.paymentConfig.service_user_token,
            service_ref_token: initResult.paymentConfig.service_ref_token,
            payment_token: paymentNFT,
            scripts: paymentScript,
            merchantUTxO: initResult.outputs.merchantUTxOs,
            paymentUTxO: initResult.outputs.paymentValidatorUTxOs,
        };

        const merchantWithdrawFlow = Effect.gen(function* (_) {
            const merchantWithdrawResult = yield* merchantWithdraw(
                lucid,
                merchantWithdrawConfig,
            );
            const merchantWithdrawSigned = yield* Effect.promise(() =>
                merchantWithdrawResult.sign.withWallet().complete()
            );

            const merchantWithdrawTxHash = yield* Effect.promise(() =>
                merchantWithdrawSigned.submit()
            );

            return merchantWithdrawTxHash;
        });

        const merchantWithdrawResult = yield* merchantWithdrawFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error withdrawing from merchant: ${error}`)
            ),
            Effect.map((hash) => {
                return hash;
            }),
        );

        yield* Effect.sync(() => emulator.awaitBlock(50));

        return {
            txHash: merchantWithdrawResult,
            withdrawConfig: merchantWithdrawConfig,
        };
    });
};

test<LucidContext>("Test 1 - Merchant Withdraw", async () => {
    const program = Effect.gen(function* () {
        const context = yield* makeEmulatorContext;
        const result = yield* merchantWithdrawTestCase(context);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
    expect(result.withdrawConfig).toBeDefined();

    // Add assertions to verify the extended configuration
    expect(result.withdrawConfig.subscription_end).toBeGreaterThan(
        result.withdrawConfig.subscription_start,
    );
    expect(result.withdrawConfig.total_subscription_fee).toBe(
        result.withdrawConfig.interval_amount *
            result.withdrawConfig.num_intervals,
    );
});
