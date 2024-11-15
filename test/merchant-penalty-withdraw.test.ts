import {
    merchantPenaltyWithdraw,
    toUnit,
    WithdrawPenaltyConfig,
} from "../src/index.js";
import { expect, test } from "vitest";
import { Effect } from "effect";

import { LucidContext } from "./service/lucidContext.js";
import { SetupResult, setupTest } from "./setupTest.js";
import { unsubscribeTestCase } from "./unsubscribeTestCase.js";
import {
    paymentPolicyId,
    paymentScript,
    servicePolicyId,
} from "./common/constants.js";

type MerchantPenaltyResult = {
    txHash: string;
    withdrawConfig: WithdrawPenaltyConfig;
};

export const withdrawPenaltyTestCase = (
    setupResult: SetupResult,
): Effect.Effect<MerchantPenaltyResult, Error, never> => {
    return Effect.gen(function* () {
        const {
            context: { lucid, users, emulator },
            serviceRefName,
            serviceUTxOs,
            merchantUTxOs,
            serviceUserName,
        } = setupResult;

        if (emulator && lucid.config().network === "Custom") {
            const initResult = yield* unsubscribeTestCase(setupResult);

            expect(initResult).toBeDefined();
            expect(typeof initResult.txHash).toBe("string");

            yield* Effect.sync(() => emulator.awaitBlock(10));
        }

        const serviceRefNft = toUnit(
            servicePolicyId,
            serviceRefName,
        );

        const serviceUserNft = toUnit(
            servicePolicyId,
            serviceUserName,
        );

        const withdrawPenaltyConfig: WithdrawPenaltyConfig = {
            merchant_token: serviceUserNft,
            service_ref_token: serviceRefNft,
            merchantUTxOs: merchantUTxOs,
            serviceUTxOs: serviceUTxOs,
            payment_policy_Id: paymentPolicyId,
            scripts: paymentScript,
        };
        lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

        const penaltyWithdrawFlow = Effect.gen(function* (_) {
            const merchantWithdrawResult = yield* merchantPenaltyWithdraw(
                lucid,
                withdrawPenaltyConfig,
            );
            const merchantWithdrawSigned = yield* Effect.promise(() =>
                merchantWithdrawResult.sign.withWallet().complete()
            );

            const merchantWithdrawTxHash = yield* Effect.promise(() =>
                merchantWithdrawSigned.submit()
            );

            return merchantWithdrawTxHash;
        });

        const merchantWithdrawResult = yield* penaltyWithdrawFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error creating Account: ${error}`)
            ),
            Effect.map((hash) => {
                return hash;
            }),
        );

        return {
            txHash: merchantWithdrawResult,
            withdrawConfig: withdrawPenaltyConfig,
        };
    });
};

test<LucidContext>("Test 1 - Merchant Penalty Withdraw", async () => {
    const program = Effect.gen(function* ($) {
        const setupContext = yield* setupTest();
        const result = yield* withdrawPenaltyTestCase(setupContext);
        return result;
    });
    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
    expect(result.withdrawConfig).toBeDefined();
});
