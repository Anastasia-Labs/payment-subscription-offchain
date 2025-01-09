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
            subscriberUTxOs,
            subscriberNftTn,
            serviceNftTn,
        } = setupResult;

        const network = lucid.config().network;
        if (!network) {
            throw Error("Invalid Network Selection");
        }

        const paymentConfig: InitPaymentConfig = {
            service_nft_tn: serviceNftTn,
            subscriber_nft_tn: subscriberNftTn,
        };

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

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
