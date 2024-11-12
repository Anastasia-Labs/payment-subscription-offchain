import {
    ADA,
    merchantWithdraw,
    MerchantWithdrawConfig,
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
// import { initiateSubscriptionTestCase } from "./initiate-subscription.test.js";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import {
    LucidContext,
    makeEmulatorContext,
    makeLucidContext,
} from "./service/lucidContext.js";
import { initiateSubscriptionTestCase } from "./initiateSubscriptionTestCase.js";
import { getPaymentValidatorDatum } from "../src/endpoints/utils.js";
import { SetupResult, setupTest } from "./setupTest.js";

type MerchantWithdrawResult = {
    txHash: string;
    withdrawConfig: MerchantWithdrawConfig;
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

export const merchantWithdrawTestCase = (
    setupResult: SetupResult,
): Effect.Effect<MerchantWithdrawResult, Error, never> => {
    const { context } = setupResult;
    const { lucid, users, emulator } = context;

    const network = lucid.config().network;
    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

    return Effect.gen(function* () {
        if (emulator && lucid.config().network === "Custom") {
            const initResult = yield* initiateSubscriptionTestCase(setupResult);

            expect(initResult).toBeDefined();
            expect(typeof initResult.txHash).toBe("string"); // Assuming the initResult is a transaction hash

            yield* Effect.sync(() => emulator.awaitBlock(10));
        }

        // // const paymentValidator = readMultiValidators(blueprint, true, [
        // //     initResult.paymentConfig.service_policyId,
        // //     initResult.paymentConfig.account_policyId,
        // // ]);

        // // const paymentScript = {
        // //     spending: paymentValidator.spendPayment.script,
        // //     minting: paymentValidator.mintPayment.script,
        // //     staking: "",
        // // };

        // const paymentPolicyId = mintingPolicyToId(
        //     paymentValidator.mintPayment,
        // );

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

        lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
        const merchantAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );

        const merchantUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(merchantAddress)
        );

        console.log("Merchant UTxOs>>>: \n", merchantUTxOs);

        const {
            refTokenName: serviceRefName,
            userTokenName: serviceUserName,
        } = findCip68TokenNames([
            serviceUTxOs[0],
            merchantUTxOs[0],
        ], servicePolicyId);

        const serviceRefNft = toUnit(
            servicePolicyId,
            serviceRefName,
        );

        const serviceUserNft = toUnit(
            servicePolicyId,
            serviceUserName,
        );

        // Calculate new subscription end time
        let currentTime: bigint;
        if (emulator) {
            currentTime = BigInt(emulator.now());
        } else {
            currentTime = BigInt(Date.now()); // Defaults to 1 hours
        }

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
        const merchantWithdrawConfig: MerchantWithdrawConfig = {
            service_nft_tn: paymentData[0].service_nft_tn,
            account_nft_tn: paymentData[0].account_nft_tn,
            account_policyId: accountPolicyId,
            service_policyId: servicePolicyId,
            subscription_fee: paymentData[0].subscription_fee,
            total_subscription_fee: newTotalSubscriptionFee,
            subscription_start: paymentData[0].subscription_start,
            subscription_end: newSubscriptionEnd,
            interval_amount: interval_amount,
            num_intervals: newNumIntervals,
            interval_length: paymentData[0].interval_length,
            last_claimed: currentTime,
            penalty_fee: paymentData[0].penalty_fee,
            penalty_fee_qty: paymentData[0].penalty_fee_qty,
            minimum_ada: paymentData[0].minimum_ada,
            merchant_token: serviceUserNft,
            service_ref_token: serviceRefNft,
            payment_token: paymentNFT,
            serviceUTxOs: serviceUTxOs,
            scripts: paymentScript,
        };

        const merchantWithdrawFlow = Effect.gen(function* (_) {
            const merchantWithdrawResult = yield* merchantWithdraw(
                lucid,
                merchantWithdrawConfig,
            );
            const merchantWithdrawSigned = yield* Effect.promise(() =>
                merchantWithdrawResult.sign.withWallet().complete()
            );

            const merchantWithdrawTxHash = yield* Effect.promise(() =>
                merchantWithdrawSigned.submit()
            );

            return merchantWithdrawTxHash;
        });

        const merchantWithdrawResult = yield* merchantWithdrawFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error withdrawing from merchant: ${error}`)
            ),
            Effect.map((hash) => {
                return hash;
            }),
        );

        // yield* Effect.sync(() => emulator.awaitBlock(10));

        return {
            txHash: merchantWithdrawResult,
            withdrawConfig: merchantWithdrawConfig,
        };
    });
};

test<LucidContext>("Test 1 - Merchant Withdraw", async () => {
    const program = Effect.gen(function* () {
        const setupContext = yield* setupTest();
        const result = yield* merchantWithdrawTestCase(setupContext);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
    expect(result.withdrawConfig).toBeDefined();

    // Add assertions to verify the extended configuration
    expect(result.withdrawConfig.subscription_end).toBeGreaterThan(
        result.withdrawConfig.subscription_start,
    );
    expect(result.withdrawConfig.total_subscription_fee).toBe(
        result.withdrawConfig.interval_amount *
            result.withdrawConfig.num_intervals,
    );
});
