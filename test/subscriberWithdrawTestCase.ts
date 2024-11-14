import {
    ServiceDatum,
    subscriberWithdraw,
    SubscriberWithdrawConfig,
    toUnit,
} from "../src/index.js";
import { expect } from "vitest";
import { Effect } from "effect";
import { initiateSubscriptionTestCase } from "./initiateSubscriptionTestCase.js";
import { removeServiceTestCase } from "./removeServiceTestCase.js";
import { SetupResult } from "./setupTest.js";
import {
    accountPolicyId,
    paymentPolicyId,
    paymentScript,
    serviceValidator,
} from "./common/constants.js";
import { Data, validatorToAddress } from "@lucid-evolution/lucid";

type SubscriberWithdrawResult = {
    txHash: string;
};

export const subscriberWithdrawTestCase = (
    setupResult: SetupResult,
): Effect.Effect<SubscriberWithdrawResult, Error, never> => {
    return Effect.gen(function* () {
        const {
            context: { lucid, users, emulator },
            accUserName,
            serviceRefName,
        } = setupResult;

        const network = lucid.config().network;

        if (emulator && lucid.config().network === "Custom") {
            const initResult = yield* initiateSubscriptionTestCase(setupResult);

            expect(initResult).toBeDefined();
            expect(typeof initResult.txHash).toBe("string"); // Assuming the initResult is a transaction hash

            yield* Effect.sync(() => emulator.awaitBlock(10));

            const serviceResult = yield* removeServiceTestCase(
                initResult.setupResult,
            );

            expect(serviceResult).toBeDefined();
            expect(typeof serviceResult.txHash).toBe("string"); // Assuming the serviceResult is a transaction hash

            yield* Effect.sync(() => emulator.awaitBlock(10));
        }

        const serviceAddress = validatorToAddress(
            network,
            serviceValidator.spendService,
        );

        const serviceUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(serviceAddress)
        );

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        const accUsrNft = toUnit(
            accountPolicyId,
            accUserName,
        );

        // Get utxos where is_active in datum is set to true
        const inActiveServiceUTxOs = serviceUTxOs.filter((utxo) => {
            if (!utxo.datum) return false;

            const datum = Data.from<ServiceDatum>(utxo.datum, ServiceDatum);
            console.log("datum.is_active: ", datum.is_active);

            return datum.is_active === false;
        });

        const subscriberWithdrawConfig: SubscriberWithdrawConfig = {
            service_ref_name: serviceRefName,
            subscriber_token: accUsrNft,
            payment_policy_Id: paymentPolicyId,
            serviceUTxOs: inActiveServiceUTxOs,
            scripts: paymentScript,
        };

        const subscriberWithdrawFlow = Effect.gen(function* (_) {
            const subscriberWithdrawResult = yield* subscriberWithdraw(
                lucid,
                subscriberWithdrawConfig,
            );
            const subscriberWithdrawSigned = yield* Effect.promise(() =>
                subscriberWithdrawResult.sign.withWallet().complete()
            );

            console.log(
                "subscriberWithdrawSigned Hash>>>: ",
                subscriberWithdrawSigned,
            );

            const subscriberWithdrawTxHash = yield* Effect.promise(() =>
                subscriberWithdrawSigned.submit()
            );

            return subscriberWithdrawTxHash;
        });

        const subscriberWithdrawResult = yield* subscriberWithdrawFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error updating is_active in service datum ${error}`)
            ),
            Effect.map((hash) => {
                return hash;
            }),
        );

        return {
            txHash: subscriberWithdrawResult,
        };
    });
};
