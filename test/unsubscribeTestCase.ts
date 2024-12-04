import { toUnit, UnsubscribeConfig, unsubscribeService } from "../src/index.js";
import { Effect } from "effect";
import { initiateSubscriptionTestCase } from "./initiateSubscriptionTestCase.js";
import { expect } from "vitest";
import { SetupResult } from "./setupTest.js";
import {
    accountPolicyId,
    paymentPolicyId,
    paymentScript,
    servicePolicyId,
} from "./common/constants.js";

type UnsubscribeResult = {
    txHash: string;
};

export const unsubscribeTestCase = (
    setupResult: SetupResult,
): Effect.Effect<UnsubscribeResult, Error, never> => {
    return Effect.gen(function* () {
        const {
            context: { lucid, users, emulator },
            serviceRefName,
            currentTime,
            accUserName,
            network,
        } = setupResult;

        if (emulator && network === "Custom") {
            const initResult = yield* initiateSubscriptionTestCase(setupResult);

            expect(initResult).toBeDefined();
            expect(typeof initResult.txHash).toBe("string"); // Assuming the initResult is a transaction hash

            yield* Effect.sync(() => emulator.awaitBlock(10));
        }

        const serviceRefNft = toUnit(
            servicePolicyId,
            serviceRefName,
        );

        const accUsrNft = toUnit(
            accountPolicyId,
            accUserName,
        );

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
        const unsubscribeConfig: UnsubscribeConfig = {
            service_nft_tn: serviceRefName,
            account_nft_tn: accUserName,
            currentTime: currentTime,
            user_token: accUsrNft,
            ref_token: serviceRefNft,
            payment_policy_Id: paymentPolicyId,
            payment_scripts: paymentScript,
        };

        const unsubscribeFlow = Effect.gen(function* (_) {
            const unsubscribeResult = yield* unsubscribeService(
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
