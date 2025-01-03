import {
    ServiceDatum,
    SubscriberWithdrawConfig,
    subscriberWithdrawProgram,
    toUnit,
} from "../src/index.js";
import { expect } from "vitest";
import { Effect } from "effect";
import { initSubscriptionTestCase } from "./initiateSubscriptionTestCase.js";
import { removeServiceTestCase } from "./removeServiceTestCase.js";
import { SetupResult } from "./setupTest.js";
import {
    accountPolicyId,
    serviceValidator,
} from "../src/core/validators/constants.js";
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
            subscriberNftTn,
            serviceNftTn,
        } = setupResult;

        const network = lucid.config().network;
        if (!network) {
            throw Error("Invalid Network selection");
        }

        if (emulator && lucid.config().network === "Custom") {
            const initResult = yield* initSubscriptionTestCase(setupResult);

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

        // Get utxos where is_active in datum is set to true
        const inActiveServiceUTxOs = serviceUTxOs.filter((utxo) => {
            if (!utxo.datum) return false;

            const datum = Data.from<ServiceDatum>(utxo.datum, ServiceDatum);

            return datum.is_active === false;
        });

        const subscriberWithdrawConfig: SubscriberWithdrawConfig = {
            service_nft_tn: serviceNftTn,
            subscriber_nft_tn: subscriberNftTn,
            service_utxos: inActiveServiceUTxOs,
        };

        const subscriberWithdrawFlow = Effect.gen(function* (_) {
            const subscriberWithdrawResult = yield* subscriberWithdrawProgram(
                lucid,
                subscriberWithdrawConfig,
            );
            const subscriberWithdrawSigned = yield* Effect.promise(() =>
                subscriberWithdrawResult.sign.withWallet().complete()
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
