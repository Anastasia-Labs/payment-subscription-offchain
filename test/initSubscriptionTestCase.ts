import {
    InitPaymentConfig,
    initSubscriptionProgram,
    validatorToAddress,
} from "../src/index.js";
import { Effect } from "effect";
import { SetupResult } from "./setupTest.js";
import { paymentValidator } from "../src/core/validators/constants.js";

type InitSubscriptionResult = {
    txHash: string;
    paymentConfig: InitPaymentConfig;
    setupResult: SetupResult;
};

export const initSubscriptionTestCase = (
    setupResult: SetupResult,
): Effect.Effect<InitSubscriptionResult, Error, never> => {
    return Effect.gen(function* () {
        const {
            context: { lucid, users },
            currentTime,
            subscriberUTxOs,
            subscriberNftTn,
            serviceNftTn,
        } = setupResult;

        const network = lucid.config().network;
        if (!network) {
            throw Error("Invalid Network Selection");
        }

        console.log(
            "initSubscriptionTestCase subscriberUTxOs: ",
            subscriberUTxOs,
        );
        console.log(
            "initSubscriptionTestCase subscriberNftTn: ",
            subscriberNftTn,
        );
        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        const subscriberAddress = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        // Get fresh UTxOs for this address
        const currentSubscriberUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(subscriberAddress)
        );

        // Debug logging
        console.log("Current wallet address:", subscriberAddress);
        console.log("Available UTxOs:", currentSubscriberUTxOs);
        console.log("Looking for NFT:", subscriberNftTn);

        const paymentConfig: InitPaymentConfig = {
            service_nft_tn: serviceNftTn,
            subscriber_nft_tn: subscriberNftTn,
            num_intervals: 12n,
            current_time: currentTime,
        };

        const initSubscriptionFlow = Effect.gen(function* (_) {
            const initSubscriptionUnsigned = yield* initSubscriptionProgram(
                lucid,
                paymentConfig,
            );

            const initSubscriptionSigned = yield* Effect.tryPromise(() =>
                initSubscriptionUnsigned.sign.withWallet().complete()
            );

            const initSubscriptionHash = yield* Effect.tryPromise(() =>
                initSubscriptionSigned.submit()
            );

            return initSubscriptionHash;
        });

        const subscriptionResult = yield* initSubscriptionFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error initiating subscription: ${error}`)
            ),
            Effect.map((hash) => {
                return hash;
            }),
        );

        const paymentValidatorAddress = validatorToAddress(
            network,
            paymentValidator.mintPayment,
        );

        const paymentUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(paymentValidatorAddress)
        );

        return {
            txHash: subscriptionResult,
            paymentConfig,
            setupResult,
            outputs: {
                subscriberUTxOs,
                paymentUTxOs,
            },
        };
    });
};
