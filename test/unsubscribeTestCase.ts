import {
    mintingPolicyToId,
    toUnit,
    UnsubscribeConfig,
    unsubscribeService,
    validatorToAddress,
} from "../src/index.js";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { getPaymentValidatorDatum } from "../src/endpoints/utils.js";
import { tokenNameFromUTxO } from "../src/core/utils/assets.js";
import { initiateSubscriptionTestCase } from "./initiateSubscriptionTestCase.js";
import { expect } from "vitest";
import { SetupResult } from "./setupTest.js";

type UnsubscribeResult = {
    txHash: string;
};

const serviceValidator = readMultiValidators(blueprint, false, []);
const servicePolicyId = mintingPolicyToId(serviceValidator.mintService);

const serviceScript = {
    spending: serviceValidator.spendService.script,
    minting: serviceValidator.mintService.script,
    staking: "",
};

const accountValidator = readMultiValidators(blueprint, false, []);
const accountPolicyId = mintingPolicyToId(accountValidator.mintAccount);

const paymentValidator = readMultiValidators(blueprint, true, [
    servicePolicyId,
    accountPolicyId,
]);
const paymentPolicyId = mintingPolicyToId(
    paymentValidator.mintPayment,
);

const paymentScript = {
    spending: paymentValidator.spendPayment.script,
    minting: paymentValidator.mintPayment.script,
    staking: "",
};

export const unsubscribeTestCase = (
    setupResult: SetupResult,
): Effect.Effect<UnsubscribeResult, Error, never> => {
    return Effect.gen(function* () {
        const { context } = setupResult;
        const { serviceRefName } = setupResult;
        const { accUserName } = setupResult;

        const { lucid, users, emulator } = context;
        const network = lucid.config().network;
        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        if (emulator && lucid.config().network === "Custom") {
            const initResult = yield* initiateSubscriptionTestCase(setupResult);

            expect(initResult).toBeDefined();
            expect(typeof initResult.txHash).toBe("string"); // Assuming the initResult is a transaction hash

            yield* Effect.sync(() => emulator.awaitBlock(10));
        }

        const serviceRefNft = toUnit(
            servicePolicyId,
            serviceRefName,
        );

        console.log("findCip68TokenNames Account>>>: \n");

        const accUsrNft = toUnit(
            accountPolicyId,
            accUserName,
        );

        const paymentAddress = validatorToAddress(
            network,
            paymentValidator.spendPayment,
        );

        const paymentUTxOs = yield* Effect.promise(() =>
            lucid.config().provider.getUtxos(paymentAddress)
        );

        console.log("Payment UTxOs>>>: \n", paymentUTxOs);

        const payment_token_name = tokenNameFromUTxO(
            paymentUTxOs,
            paymentPolicyId,
        );

        const paymentNFT = toUnit(
            paymentPolicyId,
            payment_token_name, //tokenNameWithoutFunc,
        );

        const paymentData = yield* Effect.promise(
            () => (getPaymentValidatorDatum(paymentUTxOs)),
        );

        let currentTime: bigint;
        if (emulator) {
            currentTime = BigInt(Date.now()) + BigInt(1000 * 60); // Add 1 minute
        } else {
            currentTime = BigInt(Date.now()) + BigInt(1000 * 60); // Add 1 minute
        }

        const total_subscription_time = BigInt(
            paymentData[0].subscription_end - paymentData[0].subscription_start,
        );
        const time_elapsed = BigInt(
            Math.min(
                Number(currentTime - paymentData[0].subscription_start),
                Number(total_subscription_time),
            ),
        );

        const refund_amount = paymentData[0].total_subscription_fee *
            (total_subscription_time - time_elapsed) / total_subscription_time;

        const unsubscribeConfig: UnsubscribeConfig = {
            service_nft_tn: serviceRefName,
            account_nft_tn: accUserName,
            subscription_start: paymentData[0].subscription_start,
            service_fee: paymentData[0].subscription_fee,
            service_fee_qty: paymentData[0].total_subscription_fee,
            penalty_fee: paymentData[0].penalty_fee,
            penalty_fee_qty: paymentData[0].penalty_fee_qty,
            refund_amount: refund_amount,
            user_token: accUsrNft,
            ref_token: serviceRefNft,
            payment_token: paymentNFT,
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

            console.log(
                "updateServiceSigned Hash>>>: ",
                updateServiceSigned,
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
