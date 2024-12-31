import {
    ExtendPaymentConfig,
    extendSubscription,
    toUnit,
} from "../src/index.js";
import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext } from "./service/lucidContext.js";
import { initiateSubscriptionTestCase } from "./initiateSubscriptionTestCase.js";
import { SetupResult, setupTest } from "./setupTest.js";
import { accountPolicyId } from "../src/core/validators/constants.js";

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
            serviceUTxOs,
            subscriberUTxOs,
            subscriberNftTn: accUserName,
        } = setupResult;

        if (emulator && lucid.config().network === "Custom") {
            const initResult = yield* initiateSubscriptionTestCase(setupResult);

            expect(initResult).toBeDefined();
            expect(typeof initResult.txHash).toBe("string"); // Assuming the initResult is a transaction hash

            yield* Effect.sync(() => emulator.awaitBlock(10));
        }

        const accUsrNft = toUnit(
            accountPolicyId,
            accUserName,
        );

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        const extendPaymentConfig: ExtendPaymentConfig = {
            // payment_policy_Id: paymentPolicyId,
            acc_user_token: accUsrNft,
            subscriber_utxos: subscriberUTxOs,
            service_utxos: serviceUTxOs,
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
    const program = Effect.gen(function* ($) {
        const setupContext = yield* setupTest();
        const result = yield* extendSubscriptionTestCase(setupContext);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
});
