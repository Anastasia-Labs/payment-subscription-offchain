import {
    ADA,
    ExtendPaymentConfig,
    extendSubscription,
    toUnit,
} from "../src/index.js";
import { expect, test } from "vitest";
import {
    Address,
    mintingPolicyToId,
    validatorToAddress,
} from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import {
    findCip68TokenNames,
    tokenNameFromUTxO,
} from "../src/core/utils/assets.js";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import {
    LucidContext,
    makeEmulatorContext,
    makeLucidContext,
} from "./service/lucidContext.js";
import { initiateSubscriptionTestCase } from "./initiateSubscriptionTestCase.js";
import {
    getPaymentValidatorDatum,
    getServiceValidatorDatum,
} from "../src/endpoints/utils.js";
import { SetupResult, setupTest } from "./setupTest.js";

type ExtendSubscriptionResult = {
    txHash: string;
    extendedConfig: ExtendPaymentConfig;
};
const serviceValidator = readMultiValidators(blueprint, false, []);
const servicePolicyId = mintingPolicyToId(serviceValidator.mintService);

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

console.log("Policies: ////");
console.log("servicePolicyId: ////", servicePolicyId);
console.log("accountPolicyId: ////", accountPolicyId);
console.log("paymentPolicyId: ////", paymentPolicyId);

export const extendSubscriptionTestCase = (
    setupResult: SetupResult,
): Effect.Effect<ExtendSubscriptionResult, Error, never> => {
    return Effect.gen(function* () {
        const { context } = setupResult;
        const { lucid, users, emulator } = context;

        const network = lucid.config().network;
        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
        // let paymentAddress: Address;

        if (emulator && lucid.config().network === "Custom") {
            const initResult = yield* initiateSubscriptionTestCase(setupResult);

            expect(initResult).toBeDefined();
            expect(typeof initResult.txHash).toBe("string"); // Assuming the initResult is a transaction hash

            yield* Effect.sync(() => emulator.awaitBlock(10));
        }

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

        const serviceAddress = validatorToAddress(
            network,
            serviceValidator.spendService,
        );

        const serviceUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(serviceAddress)
        );

        const subscriberAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );

        const subscriberUTxOs = yield* Effect.promise(() =>
            lucid.config().provider.getUtxos(subscriberAddress)
        );
        // Calculate new subscription end time
        let currentTime: bigint;
        if (emulator) {
            currentTime = BigInt(emulator.now());
        } else {
            currentTime = BigInt(Date.now());
        }

        const accountAddress = validatorToAddress(
            network,
            accountValidator.mintAccount,
        );

        const accountUTxOs = yield* Effect.promise(() =>
            lucid.config().provider.getUtxos(accountAddress)
        );

        const { refTokenName: accRefName, userTokenName: accUserName } =
            findCip68TokenNames([
                accountUTxOs[0],
                subscriberUTxOs[0],
            ], accountPolicyId);

        const accRefNft = toUnit(
            accountPolicyId,
            accRefName,
        );

        const accUsrNft = toUnit(
            accountPolicyId,
            accUserName,
        );

        lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
        const merchantAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        const merchantUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(merchantAddress)
        );

        // Service NFTs
        const {
            refTokenName: serviceRefName,
            userTokenName: serviceUserName,
        } = findCip68TokenNames([
            serviceUTxOs[0],
            merchantUTxOs[0],
        ], servicePolicyId);

        const servcRefNft = toUnit(
            servicePolicyId,
            serviceRefName,
        );

        const serviceUserNft = toUnit(
            servicePolicyId,
            serviceUserName,
        );

        const paymentData = yield* Effect.promise(
            () => (getPaymentValidatorDatum(paymentUTxOs)),
        );

        const extension_intervals = BigInt(1); // Number of intervals to extend
        const interval_amount = paymentData[0].interval_amount *
            extension_intervals;
        const newTotalSubscriptionFee = paymentData[0].total_subscription_fee +
            (interval_amount * extension_intervals);
        const newNumIntervals = paymentData[0].num_intervals +
            extension_intervals;
        const extension_period = paymentData[0].interval_length *
            extension_intervals;

        const newSubscriptionEnd = paymentData[0].subscription_end +
            extension_period;

        const extendPaymentConfig: ExtendPaymentConfig = {
            service_nft_tn: paymentData[0].service_nft_tn,
            account_nft_tn: paymentData[0].account_nft_tn,
            account_policyId: accountPolicyId,
            service_policyId: servicePolicyId,
            subscription_fee: paymentData[0].subscription_fee,
            total_subscription_fee: newTotalSubscriptionFee,
            subscription_start: currentTime,
            subscription_end: newSubscriptionEnd,
            interval_amount: interval_amount,
            num_intervals: newNumIntervals,
            interval_length: paymentData[0].interval_length,
            last_claimed: paymentData[0].last_claimed,
            penalty_fee: ADA,
            penalty_fee_qty: paymentData[0].penalty_fee_qty,
            minimum_ada: paymentData[0].minimum_ada,
            user_token: accUsrNft,
            service_ref_token: servcRefNft,
            payment_token: paymentNFT,
            scripts: paymentScript,
            subscriberUTxO: subscriberUTxOs,
            serviceUTxO: serviceUTxOs,
            paymentUTxO: paymentUTxOs,
        };

        if (emulator) yield* Effect.sync(() => emulator.awaitBlock(10));
        const extendPaymentFlow = Effect.gen(function* (_) {
            lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
            const extendResult = yield* extendSubscription(
                lucid,
                extendPaymentConfig,
            );
            const extendSigned = yield* Effect.promise(() =>
                extendResult.sign.withWallet().complete()
            );

            const extendTxHash = yield* Effect.promise(() =>
                extendSigned.submit()
            );

            // yield* Effect.sync(() => emulator.awaitBlock(100));

            return extendTxHash;
        });
        if (emulator) yield* Effect.sync(() => emulator.awaitBlock(10));

        const extendPaymentResult = yield* extendPaymentFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error creating Account: ${error}`)
            ),
            Effect.map((hash) => {
                return hash;
            }),
        );

        return {
            txHash: extendPaymentResult,
            extendedConfig: extendPaymentConfig,
        };
    });
};

test<LucidContext>("Test 1 - Extend Service", async () => {
    const program = Effect.gen(function* ($) {
        const setupContext = yield* setupTest();
        const result = yield* extendSubscriptionTestCase(setupContext);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");

    // Add assertions to verify the extended configuration
    expect(result.extendedConfig.subscription_end).toBeGreaterThan(
        result.extendedConfig.subscription_start,
    );
    expect(result.extendedConfig.total_subscription_fee).toBe(
        result.extendedConfig.interval_amount *
            result.extendedConfig.num_intervals,
    );
});
