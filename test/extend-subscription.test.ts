import {
    ExtendPaymentConfig,
    extendSubscriptionProgram,
} from "../src/index.js";
import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext } from "./service/lucidContext.js";
import { initSubscriptionTestCase } from "./initSubscriptionTestCase.js";
import { SetupResult, setupTest } from "./setupTest.js";

type ExtendSubscriptionResult = {
    txHash: string;
    extendedConfig: ExtendPaymentConfig;
};

export const extendSubscriptionTestCase = (
    setupResult: SetupResult,
): Effect.Effect<ExtendSubscriptionResult, Error, never> => {
    return Effect.gen(function* () {
        const {
            context: { lucid, users, emulator },
            subscriberNftTn,
            serviceNftTn,
        } = setupResult;

        if (emulator && lucid.config().network === "Custom") {
            const initResult = yield* initSubscriptionTestCase(setupResult);

            expect(initResult).toBeDefined();
            expect(typeof initResult.txHash).toBe("string"); // Assuming the initResult is a transaction hash

            yield* Effect.sync(() => emulator.awaitBlock(10));
        }

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        const extendPaymentConfig: ExtendPaymentConfig = {
            service_nft_tn: serviceNftTn,
            subscriber_nft_tn: subscriberNftTn,
            extension_intervals: BigInt(6), // Number of intervals to extend
        };

        const extendPaymentFlow = Effect.gen(function* (_) {
            const extendUnsigned = yield* extendSubscriptionProgram(
                lucid,
                extendPaymentConfig,
            );
            const extendSigned = yield* Effect.promise(() =>
                extendUnsigned.sign.withWallet().complete()
            );
            const extendTxHash = yield* Effect.promise(() =>
                extendSigned.submit()
            );
            return extendTxHash;
        });
        if (emulator) yield* Effect.sync(() => emulator.awaitBlock(10));

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

test<LucidContext>("Test 8 - Extend Service", async () => {
    const program = Effect.gen(function* (_) {
        const setupContext = yield* setupTest();
        const result = yield* extendSubscriptionTestCase(setupContext);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
});
