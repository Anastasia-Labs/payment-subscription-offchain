import {
    merchantPenaltyWithdraw,
    PaymentDatum,
    PaymentValidatorDatum,
    PenaltyDatum,
    toUnit,
    WithdrawPenaltyConfig,
} from "../src/index.js";
import { expect, test } from "vitest";
import {
    Data,
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
import {
    getPaymentValidatorDatum,
    getPenaltyDatum,
} from "../src/endpoints/utils.js";
import { SetupResult, setupTest } from "./setupTest.js";
import { subscriberWithdrawTestCase } from "./subscriberWithdrawTestCase.js";
import { unsubscribeTestCase } from "./unsubscribeTestCase.js";

type MerchantPenaltyResult = {
    txHash: string;
    withdrawConfig: WithdrawPenaltyConfig;
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

export const withdrawPenaltyTestCase = (
    setupResult: SetupResult,
): Effect.Effect<MerchantPenaltyResult, Error, never> => {
    return Effect.gen(function* () {
        const { context } = setupResult;
        const { serviceUTxOs } = setupResult;
        const { serviceRefName } = setupResult;
        const { serviceUserName } = setupResult;
        const { merchantUTxOs } = setupResult;

        const { lucid, users, emulator } = context;

        const network = lucid.config().network;

        if (emulator && lucid.config().network === "Custom") {
            const initResult = yield* unsubscribeTestCase(setupResult);

            expect(initResult).toBeDefined();
            expect(typeof initResult.txHash).toBe("string");

            yield* Effect.sync(() => emulator.awaitBlock(10));
        }

        const paymentAddress = validatorToAddress(
            network,
            paymentValidator.spendPayment,
        );

        const paymentUTxOs = yield* Effect.promise(() =>
            lucid.config().provider.getUtxos(paymentAddress)
        );

        const payment_token_name = tokenNameFromUTxO(
            paymentUTxOs,
            paymentPolicyId,
        );

        const paymentNFT = toUnit(
            paymentPolicyId,
            payment_token_name, //tokenNameWithoutFunc,
        );

        const serviceRefNft = toUnit(
            servicePolicyId,
            serviceRefName,
        );

        const serviceUserNft = toUnit(
            servicePolicyId,
            serviceUserName,
        );
        console.log(`paymentUTxOs (raw):`, paymentUTxOs);

        const penaltyUTxOs = paymentUTxOs.filter((utxo) => {
            if (!utxo.datum) return false;
            console.log(`UTxO Datum (raw):`, utxo.datum);

            const validatorDatum = Data.from<PaymentValidatorDatum>(
                utxo.datum,
                PaymentValidatorDatum,
            );

            let datum: PenaltyDatum;
            if ("Penalty" in validatorDatum) {
                datum = validatorDatum.Penalty[0];
            } else {
                throw new Error("Expected Penalty variant");
            }

            console.log("datum.service_nft_tn: ", datum.service_nft_tn);
            console.log("serviceRefName: ", serviceRefName);

            return datum.penalty_fee_qty > 0;
        });

        const penaltyData = yield* Effect.promise(
            () => (getPenaltyDatum(penaltyUTxOs)),
        );
        console.log(`penaltyFee: ${penaltyData[0].penalty_fee_qty}`);

        const withdrawPenaltyConfig: WithdrawPenaltyConfig = {
            service_nft_tn: penaltyData[0].service_nft_tn, //AssetName,
            account_nft_tn: penaltyData[0].account_nft_tn,
            penalty_fee: penaltyData[0].penalty_fee,
            penalty_fee_qty: penaltyData[0].penalty_fee_qty,
            merchant_token: serviceUserNft,
            service_ref_token: serviceRefNft,
            payment_token: paymentNFT,
            merchantUTxOs: merchantUTxOs,
            serviceUTxOs: serviceUTxOs,
            scripts: paymentScript,
        };
        lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

        const penaltyWithdrawFlow = Effect.gen(function* (_) {
            const merchantWithdrawResult = yield* merchantPenaltyWithdraw(
                lucid,
                withdrawPenaltyConfig,
            );
            const merchantWithdrawSigned = yield* Effect.promise(() =>
                merchantWithdrawResult.sign.withWallet().complete()
            );

            const merchantWithdrawTxHash = yield* Effect.promise(() =>
                merchantWithdrawSigned.submit()
            );

            return merchantWithdrawTxHash;
        });

        const merchantWithdrawResult = yield* penaltyWithdrawFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error creating Account: ${error}`)
            ),
            Effect.map((hash) => {
                return hash;
            }),
        );

        return {
            txHash: merchantWithdrawResult,
            withdrawConfig: withdrawPenaltyConfig,
        };
    });
};

test<LucidContext>("Test 1 - Merchant Penalty Withdraw", async () => {
    const program = Effect.gen(function* ($) {
        const setupContext = yield* setupTest();
        const result = yield* withdrawPenaltyTestCase(setupContext);
        return result;
    });
    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
    expect(result.withdrawConfig).toBeDefined();
});
