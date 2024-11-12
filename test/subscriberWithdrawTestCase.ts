import {
    PaymentDatum,
    PaymentValidatorDatum,
    ServiceDatum,
    subscriberWithdraw,
    SubscriberWithdrawConfig,
    toUnit,
} from "../src/index.js";
import { expect, test } from "vitest";
import {
    Address,
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
import { initiateSubscriptionTestCase } from "./initiateSubscriptionTestCase.js";
import { getPaymentValidatorDatum } from "../src/endpoints/utils.js";
import { removeServiceTestCase } from "./removeServiceTestCase.js";
import { SetupResult, setupTest } from "./setupTest.js";

type SubscriberWithdrawResult = {
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

export const subscriberWithdrawTestCase = (
    setupResult: SetupResult,
): Effect.Effect<SubscriberWithdrawResult, Error, never> => {
    return Effect.gen(function* () {
        const { context } = setupResult;

        const { lucid, users, emulator } = context;

        const network = lucid.config().network;

        if (emulator && lucid.config().network === "Custom") {
            const initResult = yield* initiateSubscriptionTestCase(setupResult);

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

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        const serviceAddress = validatorToAddress(
            network,
            serviceValidator.spendService,
        );

        const accountAddress = validatorToAddress(
            network,
            accountValidator.spendAccount,
        );

        const subscriberAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        const subscriberUTxOs = yield* Effect.promise(() =>
            lucid.config().provider.getUtxos(subscriberAddress)
        );

        const serviceUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(serviceAddress)
        );

        lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
        const merchantAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        const merchantUTxOs = yield* Effect.promise(() =>
            lucid.config().provider.getUtxos(merchantAddress)
        );

        const accountUTxOs = yield* Effect.promise(() =>
            lucid.config().provider.getUtxos(accountAddress)
        );

        console.log("findCip68TokenNames Account>>>: \n");
        console.log("Account Address: ", accountAddress);
        console.log("AccountUTxOs: ", accountUTxOs);
        console.log("subscriberUTxOs: ", subscriberUTxOs);

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

        // Get utxos where is_active in datum is set to true
        const inActiveServiceUTxOs = serviceUTxOs.filter((utxo) => {
            if (!utxo.datum) return false;

            const datum = Data.from<ServiceDatum>(utxo.datum, ServiceDatum);
            console.log("datum.is_active: ", datum.is_active);

            return datum.is_active === false;
        });

        console.log("findCip68TokenNames Service>>>: \n");
        console.log("Service Address: ", serviceAddress);
        console.log("ServiceUTxOs: ", serviceUTxOs);

        console.log("inActiveServiceUTxOs: ", inActiveServiceUTxOs);

        const {
            refTokenName: serviceRefName,
            userTokenName: serviceUserName,
        } = findCip68TokenNames([
            inActiveServiceUTxOs[0],
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

        console.log(`UTxO paymentUTxOs:`, paymentUTxOs);
        const inActivePaymentUTxOs = paymentUTxOs.filter((utxo) => {
            if (!utxo.datum) return false;
            console.log(`UTxO Datum (raw):`, utxo.datum);

            const validatorDatum = Data.from<PaymentValidatorDatum>(
                utxo.datum,
                PaymentValidatorDatum,
            );

            let datum: PaymentDatum;
            if ("Payment" in validatorDatum) {
                datum = validatorDatum.Payment[0];
            } else {
                throw new Error("Expected Payment variant");
            }

            console.log("datum.service_nft_tn: ", datum.service_nft_tn);
            console.log("serviceRefName: ", serviceRefName);

            return datum.service_nft_tn === serviceRefName;
        });

        console.log("inActivePaymentUTxOs UTxOs>>>: \n", inActivePaymentUTxOs);

        const paymentData = yield* Effect.promise(
            () => (getPaymentValidatorDatum(inActivePaymentUTxOs)),
        );

        const subscriberWithdrawConfig: SubscriberWithdrawConfig = {
            // service_nft_tn: serviceRefName,
            // account_nft_tn: accUserName,
            // subscription_fee: paymentData[0].service_fee,
            // total_subscription_fee: paymentData[0].service_fee_qty,
            subscriber_token: accUsrNft,
            // service_ref_token: serviceRefNft,
            payment_token: paymentNFT,
            paymentDatum: paymentData[0],
            paymentUTxOs: inActivePaymentUTxOs,
            serviceUTxOs: inActiveServiceUTxOs,
            scripts: paymentScript,
        };

        const subscriberWithdrawFlow = Effect.gen(function* (_) {
            const subscriberWithdrawResult = yield* subscriberWithdraw(
                lucid,
                subscriberWithdrawConfig,
            );
            const subscriberWithdrawSigned = yield* Effect.promise(() =>
                subscriberWithdrawResult.sign.withWallet().complete()
            );

            console.log(
                "subscriberWithdrawSigned Hash>>>: ",
                subscriberWithdrawSigned,
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
            // txHash: withdrawResult,
        };
    });
};
