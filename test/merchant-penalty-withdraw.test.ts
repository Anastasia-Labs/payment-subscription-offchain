import {
    merchantPenaltyWithdrawProgram,
    WithdrawPenaltyConfig,
} from "../src/index.js";
import { expect, test } from "vitest";
import { Effect } from "effect";

import { LucidContext } from "./service/lucidContext.js";
import { SetupResult, setupTest } from "./setupTest.js";
import { unsubscribeTestCase } from "./unsubscribeTestCase.js";

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
            serviceNftTn,
            merchantNftTn,
            subscriberNftTn
        } = setupResult;

        if (emulator && lucid.config().network === "Custom") {
            const initResult = yield* unsubscribeTestCase(setupResult);

            expect(initResult).toBeDefined();
            expect(typeof initResult.txHash).toBe("string");

            yield* Effect.sync(() => emulator.awaitBlock(10));
        }

        const withdrawPenaltyConfig: WithdrawPenaltyConfig = {
            service_nft_tn: serviceNftTn,
            merchant_nft_tn: merchantNftTn,
            subscriber_nft_tn: subscriberNftTn,
        };

        lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

        const penaltyWithdrawFlow = Effect.gen(function* (_) {
            const penaltyWithdrawUnsigned =
                yield* merchantPenaltyWithdrawProgram(
                    lucid,
                    withdrawPenaltyConfig,
                );
            const penaltyWithdrawSigned = yield* Effect.promise(() =>
                penaltyWithdrawUnsigned.sign.withWallet().complete()
            );

            const penaltyWithdrawTxHash = yield* Effect.promise(() =>
                penaltyWithdrawSigned.submit()
            );

            return penaltyWithdrawTxHash;
        });

        const penaltyWithdrawResult = yield* penaltyWithdrawFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error creating Account: ${error}`)
            ),
            Effect.map((hash) => {
                return hash;
            }),
        );

        return {
            txHash: penaltyWithdrawResult,
            withdrawConfig: withdrawPenaltyConfig,
        };
    });
};

test<LucidContext>("Test 11 - Merchant Penalty Withdraw", async () => {
    const program = Effect.gen(function* (_) {
        const setupContext = yield* setupTest();
        const result = yield* withdrawPenaltyTestCase(setupContext);
        return result;
    });
    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
    expect(result.withdrawConfig).toBeDefined();
});
