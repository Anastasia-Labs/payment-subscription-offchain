import {
    ADA,
    initiateSubscription,
    InitPaymentConfig,
    toUnit,
    validatorToAddress,
} from "../src/index.js";
import { Effect } from "effect";
import { getServiceValidatorDatum } from "../src/endpoints/utils.js";
import { SetupResult } from "./setupTest.js";
import {
    accountPolicyId,
    paymentScript,
    paymentValidator,
    servicePolicyId,
} from "./common/constants.js";

type InitiateSubscriptionResult = {
    txHash: string;
    paymentConfig: InitPaymentConfig;
    setupResult: SetupResult;
};

export const initiateSubscriptionTestCase = (
    setupResult: SetupResult,
): Effect.Effect<InitiateSubscriptionResult, Error, never> => {
    return Effect.gen(function* () {
        const {
            context: { lucid, users, emulator },
            serviceUTxOs,
            subscriberUTxOs,
            currentTime,
            accUserName,
            serviceRefName,
            network,
        } = setupResult;

        const accUsrNft = toUnit(
            accountPolicyId,
            accUserName,
        );

        const servcRefNft = toUnit(
            servicePolicyId,
            serviceRefName,
        );

        const serviceData = yield* Effect.promise(
            () => (getServiceValidatorDatum(serviceUTxOs)),
        );

        const interval_amount = serviceData[0].service_fee_qty;
        const interval_length = serviceData[0].interval_length;
        const num_intervals = serviceData[0].num_intervals;
        const subscription_end = currentTime +
            interval_length * num_intervals;

        const paymentConfig: InitPaymentConfig = {
            service_nft_tn: serviceRefName,
            account_nft_tn: accUserName,
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
            service_ref_token: servcRefNft,
            account_user_token: accUsrNft,
            scripts: paymentScript,
        };

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        const initiateSubscriptionFlow = Effect.gen(function* (_) {
            const initiateSubscriptionUnsigned = yield* initiateSubscription(
                lucid,
                paymentConfig,
            );

            const initiateSubscriptionSigned = yield* Effect.tryPromise(() =>
                initiateSubscriptionUnsigned.sign.withWallet().complete()
            );

            const initiateSubscriptionHash = yield* Effect.tryPromise(() =>
                initiateSubscriptionSigned.submit()
            );

            return initiateSubscriptionHash;
        });

        const subscriptionResult = yield* initiateSubscriptionFlow.pipe(
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
