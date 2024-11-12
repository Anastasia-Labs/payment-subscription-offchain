import {
    ADA,
    Address,
    initiateSubscription,
    InitPaymentConfig,
    mintingPolicyToId,
    toUnit,
    UTxO,
    validatorToAddress,
} from "../src/index.js";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { findCip68TokenNames } from "../src/core/utils/assets.js";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { getServiceValidatorDatum } from "../src/endpoints/utils.js";
import { SetupResult } from "./setupTest.js";

type InitiateSubscriptionResult = {
    txHash: string;
    paymentConfig: InitPaymentConfig;
    setupResult: SetupResult;
    outputs: {
        // merchantUTxOs: UTxO[];
        subscriberUTxOs: UTxO[];
        // serviceUTxOs: UTxO[];
        paymentUTxOs: UTxO[];
    };
};

const validators = readMultiValidators(blueprint, false, []);

const servicePolicyId = mintingPolicyToId(validators.mintService);
const accountPolicyId = mintingPolicyToId(validators.mintAccount);

const paymentValidator = readMultiValidators(blueprint, true, [
    servicePolicyId,
    accountPolicyId,
]);

const paymentScript = {
    spending: paymentValidator.spendPayment.script,
    minting: paymentValidator.mintPayment.script,
    staking: "",
};

export const initiateSubscriptionTestCase = (
    setupResult: SetupResult,
): Effect.Effect<InitiateSubscriptionResult, Error, never> => {
    return Effect.gen(function* () {
        const { context } = setupResult;
        const { lucid, users, emulator } = context;
        const { serviceUTxOs } = setupResult;
        const { subscriberUTxOs } = setupResult;
        const { merchantUTxOs } = setupResult;
        const { currentTime } = setupResult;
        const { accRefName } = setupResult;
        const { accUserName } = setupResult;
        const { serviceRefName } = setupResult;
        const { serviceUserName } = setupResult;

        const network = lucid.config().network;

        console.log("initiateSubscriptionTestCase[0]>>>: \n");

        const accRefNft = toUnit(
            accountPolicyId,
            accRefName,
        );

        const accUsrNft = toUnit(
            accountPolicyId,
            accUserName,
        );
        console.log("accRefNft[0]>>>: \n", accRefNft);
        console.log("accUsrNft[0]>>>: \n", accUsrNft);

        const servcRefNft = toUnit(
            servicePolicyId,
            serviceRefName,
        );

        const serviceUserNft = toUnit(
            servicePolicyId,
            serviceUserName,
        );
        console.log("servcRefNft[0]>>>: \n", servcRefNft);
        console.log("serviceUserNft[0]>>>: \n", serviceUserNft);

        const serviceData = yield* Effect.promise(
            () => (getServiceValidatorDatum(serviceUTxOs)),
        );

        const interval_amount = serviceData[0].service_fee_qty;
        const interval_length = serviceData[0].interval_length;
        const num_intervals = serviceData[0].num_intervals;
        const subscription_end = currentTime +
            interval_length * num_intervals;

        console.log("subscription interval_amount: ", interval_amount);
        console.log("subscription interval_amount: ", interval_amount);
        console.log("subscription interval_amount: ", interval_amount);

        const paymentConfig: InitPaymentConfig = {
            service_nft_tn: serviceRefName,
            account_nft_tn: accUserName,
            account_policyId: accountPolicyId,
            service_policyId: servicePolicyId,
            subscription_fee: ADA,
            total_subscription_fee: interval_amount * num_intervals,
            subscription_start: currentTime + BigInt(1000 * 60),
            subscription_end: subscription_end + BigInt(1000 * 60),
            interval_length: interval_length, //30n * 24n * 60n * 60n * 1000n,
            interval_amount: interval_amount,
            num_intervals: num_intervals,
            last_claimed: 500000n,
            penalty_fee: ADA,
            penalty_fee_qty: serviceData[0].penalty_fee_qty,
            minimum_ada: serviceData[0].minimum_ada,
            scripts: paymentScript,
            service_user_token: serviceUserNft,
            service_ref_token: servcRefNft,
            account_user_token: accUsrNft,
            account_ref_token: accRefNft,
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
            lucid.config().provider.getUtxos(paymentValidatorAddress)
        );

        // lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
        // const subscriberAddress: Address = yield* Effect.promise(() =>
        //     lucid.wallet().address()
        // );

        // const subscriberUTxOs = yield* Effect.promise(() =>
        //     lucid.config().provider.getUtxos(subscriberAddress)
        // );
        // console.log("accountUTxOs[0]>>>: \n", accountUTxOs);

        return {
            txHash: subscriptionResult,
            paymentConfig,
            setupResult,
            outputs: {
                // merchantUTxOs,
                subscriberUTxOs,
                // serviceUTxOs,
                paymentUTxOs,
            },
        };
    });
};
