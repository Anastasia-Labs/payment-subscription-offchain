import {
    ADA,
    InitPaymentConfig,
    initSubscriptionProgram,
    toUnit,
    validatorToAddress,
} from "../src/index.js";
import { Effect } from "effect";
import { getServiceValidatorDatum } from "../src/endpoints/utils.js";
import { SetupResult } from "./setupTest.js";
import {
    accountPolicyId,
    paymentValidator,
    servicePolicyId,
} from "../src/core/validators/constants.js";

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
            context: { lucid, users, emulator },
            serviceUTxOs,
            subscriberUTxOs,
            currentTime,
            subscriberNftTn,
            serviceNftTn,
        } = setupResult;

        const network = lucid.config().network;
        if (!network) {
            throw Error("Invalid Network Selection");
        }

        const serviceData = yield* Effect.promise(
            () => (getServiceValidatorDatum(serviceUTxOs)),
        );

        const interval_amount = serviceData[0].service_fee_qty;
        const interval_length = serviceData[0].interval_length;
        const num_intervals = serviceData[0].num_intervals;
        const subscription_end = currentTime +
            interval_length * num_intervals;

        const paymentConfig: InitPaymentConfig = {
            service_nft_tn: serviceNftTn,
            account_nft_tn: subscriberNftTn,
            subscription_fee: ADA,
            total_subscription_fee: interval_amount * num_intervals,
            subscription_start: currentTime + BigInt(1000 * 60),
            subscription_end: subscription_end + BigInt(1000 * 60),
            interval_length: interval_length, //30n * 24n * 60n * 60n * 1000n,
            interval_amount: interval_amount,
            num_intervals: num_intervals,
            last_claimed: 0n,
            penalty_fee: ADA,
            penalty_fee_qty: serviceData[0].penalty_fee_qty,
            minimum_ada: serviceData[0].minimum_ada,
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
