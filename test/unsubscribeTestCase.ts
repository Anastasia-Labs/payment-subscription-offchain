import {
    UnsubscribeConfig,
    unsubscribeProgram,
} from "../src/index.js";
import { Effect } from "effect";
import { initSubscriptionTestCase } from "./initSubscriptionTestCase.js";
import { expect } from "vitest";
import { SetupResult } from "./setupTest.js";

type UnsubscribeResult = {
    txHash: string;
};

export const unsubscribeTestCase = (
    setupResult: SetupResult,
): Effect.Effect<UnsubscribeResult, Error, never> => {
    return Effect.gen(function* () {
        const {
            context: { lucid, users, emulator },
            currentTime,
            serviceNftTn,
            subscriberNftTn,
        } = setupResult;

        if (emulator && lucid.config().network === "Custom") {
            const initResult = yield* initSubscriptionTestCase(setupResult);

            expect(initResult).toBeDefined();
            expect(typeof initResult.txHash).toBe("string"); // Assuming the initResult is a transaction hash

            yield* Effect.sync(() => emulator.awaitBlock(10));
        }

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
        const unsubscribeConfig: UnsubscribeConfig = {
            service_nft_tn: serviceNftTn,
            subscriber_nft_tn: subscriberNftTn,
            current_time: currentTime,
        };

        const unsubscribeFlow = Effect.gen(function* (_) {
            const unsubscribeResult = yield* unsubscribeProgram(
                lucid,
                unsubscribeConfig,
            );
            const updateServiceSigned = yield* Effect.promise(() =>
                unsubscribeResult.sign.withWallet().complete()
            );

            const updateServiceTxHash = yield* Effect.promise(() =>
                updateServiceSigned.submit()
            );

            return updateServiceTxHash;
        });

        const unsubscribeResult = yield* unsubscribeFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error Unsubscribing ${error}`)
            ),
            Effect.map((hash) => {
                return hash;
            }),
        );

        return {
            txHash: unsubscribeResult,
        };
    });
};
