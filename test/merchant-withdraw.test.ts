import {
    merchantWithdraw,
    MerchantWithdrawConfig,
    toUnit,
} from "../src/index.js";
import { expect, test } from "vitest";
import { Effect } from "effect";

import { LucidContext } from "./service/lucidContext.js";
import { initiateSubscriptionTestCase } from "./initiateSubscriptionTestCase.js";
import { SetupResult, setupTest } from "./setupTest.js";
import {
    paymentPolicyId,
    paymentScript,
    servicePolicyId,
} from "./common/constants.js";

type MerchantWithdrawResult = {
    txHash: string;
    withdrawConfig: MerchantWithdrawConfig;
};

export const merchantWithdrawTestCase = (
    setupResult: SetupResult,
): Effect.Effect<MerchantWithdrawResult, Error, never> => {
    const {
        context: { lucid, users, emulator },
        serviceUTxOs,
        currentTime,
        serviceRefName,
        serviceUserName,
    } = setupResult;

    return Effect.gen(function* () {
        if (emulator && lucid.config().network === "Custom") {
            const initResult = yield* initiateSubscriptionTestCase(setupResult);

            expect(initResult).toBeDefined();
            expect(typeof initResult.txHash).toBe("string"); // Assuming the initResult is a transaction hash

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

        lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
        const merchantWithdrawConfig: MerchantWithdrawConfig = {
            last_claimed: currentTime + BigInt(1000 * 60 * 1), // 1 minute
            payment_policy_Id: paymentPolicyId,
            merchant_token: serviceUserNft,
            service_ref_token: serviceRefNft,
            serviceUTxOs: serviceUTxOs,
            scripts: paymentScript,
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

        return {
            txHash: merchantWithdrawResult,
            withdrawConfig: merchantWithdrawConfig,
        };
    });
};

test<LucidContext>("Test 1 - Merchant Withdraw", async () => {
    const program = Effect.gen(function* () {
        const setupContext = yield* setupTest();
        const result = yield* merchantWithdrawTestCase(setupContext);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
    expect(result.withdrawConfig).toBeDefined();
});
