import {
    getMultiValidator,
    MerchantWithdrawConfig,
    merchantWithdrawProgram,
    paymentPolicyId,
    paymentScript,
    tokenNameFromUTxO,
} from "../src/index.js";
import { expect, test } from "vitest";
import { Effect } from "effect";

import { LucidContext } from "./service/lucidContext.js";
import { initSubscriptionTestCase } from "./initSubscriptionTestCase.js";
import { SetupResult, setupTest } from "./setupTest.js";

type MerchantWithdrawResult = {
    txHash: string;
    withdrawConfig: MerchantWithdrawConfig;
};

export const merchantWithdrawTestCase = (
    setupResult: SetupResult,
): Effect.Effect<MerchantWithdrawResult, Error, never> => {
    const {
        context: { lucid, users, emulator },
        serviceNftTn,
        subscriberNftTn,
        merchantNftTn,
    } = setupResult;

    return Effect.gen(function* () {
        if (emulator && lucid.config().network === "Custom") {
            const initResult = yield* initSubscriptionTestCase(setupResult);

            expect(initResult).toBeDefined();
            expect(typeof initResult.txHash).toBe("string");

            yield* Effect.sync(() => emulator.awaitBlock(2));
        }

        const currentTime = BigInt((emulator && lucid.config().network === "Custom") ? emulator.now() : Date.now());

        const paymentValidator = getMultiValidator(lucid, paymentScript);

        const paymentUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(paymentValidator.spendValAddress)
        );
        const paymentNftTn = tokenNameFromUTxO(paymentUTxOs, paymentPolicyId);

        lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
        const merchantWithdrawConfig: MerchantWithdrawConfig = {
            service_nft_tn: serviceNftTn,
            subscriber_nft_tn: subscriberNftTn,
            merchant_nft_tn: merchantNftTn,
            payment_nft_tn: paymentNftTn,
            current_time: currentTime,
        };

        const merchantWithdrawFlow = Effect.gen(function* (_) {
            const merchantWithdrawUnsigned = yield* merchantWithdrawProgram(lucid, merchantWithdrawConfig);
            const merchantWithdrawSigned = yield* Effect.promise(() => merchantWithdrawUnsigned.sign.withWallet().complete());
            const merchantWithdrawTxHash = yield* Effect.promise(() => merchantWithdrawSigned.submit());
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

        return {
            txHash: merchantWithdrawResult,
            withdrawConfig: merchantWithdrawConfig,
        };
    });
};

test<LucidContext>("Test 9 - Merchant Withdraw", async () => {
    const program = Effect.gen(function* () {
        const setupContext = yield* setupTest(5n * 1000n);
        const result = yield* merchantWithdrawTestCase(setupContext);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
    expect(result.withdrawConfig).toBeDefined();
});
