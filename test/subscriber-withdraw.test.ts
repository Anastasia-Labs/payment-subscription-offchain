import {
    CreatePenaltyConfig,
    Emulator,
    generateEmulatorAccount,
    InitPaymentConfig,
    Lucid,
    LucidEvolution,
    subscriberWithdraw,
    toUnit,
    UpdateServiceConfig,
    updateServiceDatum,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import {
    mintingPolicyToId,
    PROTOCOL_PARAMETERS_DEFAULT,
    UTxO,
    validatorToAddress,
} from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { tokenNameFromUTxO } from "../src/core/utils/assets.js";
import { initiateSubscriptionTestCase } from "./initiate-subscription.test.js";

type LucidContext = {
    lucid: LucidEvolution;
    users: any;
    emulator: Emulator;
};

// INITIALIZE EMULATOR + ACCOUNTS
beforeEach<LucidContext>(async (context) => {
    context.users = {
        subscriber: generateEmulatorAccount({
            lovelace: BigInt(1000_000_000),
        }),
        merchant: generateEmulatorAccount({
            lovelace: BigInt(1000_000_000),
        }),
    };

    context.emulator = new Emulator([
        context.users.subscriber,
        context.users.merchant,
    ], { ...PROTOCOL_PARAMETERS_DEFAULT, maxTxSize: 21000 });

    context.lucid = await Lucid(context.emulator, "Custom");
});

type SubscriberWithdrawResult = {
    txHash: string;
    paymentConfig: InitPaymentConfig;
    penaltyConfig: CreatePenaltyConfig;
    outputs: { paymentUTxOs: UTxO[] };
};

export const subscriberWithdrawTestCase = (
    { lucid, users, emulator }: LucidContext,
): Effect.Effect<SubscriberWithdrawResult, Error, never> => {
    return Effect.gen(function* () {
        const initResult = yield* initiateSubscriptionTestCase({
            lucid,
            users,
            emulator,
        });

        expect(initResult).toBeDefined();
        expect(typeof initResult.txHash).toBe("string"); // Assuming the initResult is a transaction hash

        yield* Effect.sync(() => emulator.awaitBlock(100));

        const serviceValidator = readMultiValidators(false, []);

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        const serviceScript = {
            spending: serviceValidator.spendService.script,
            minting: serviceValidator.mintService.script,
            staking: "",
        };

        const updateServiceConfig: UpdateServiceConfig = {
            new_service_fee: initResult.paymentConfig.subscription_fee,
            new_service_fee_qty: initResult.paymentConfig.interval_amount,
            new_penalty_fee: initResult.paymentConfig.penalty_fee,
            new_penalty_fee_qty: initResult.paymentConfig.penalty_fee_qty,
            new_interval_length: initResult.paymentConfig.interval_length,
            new_num_intervals: initResult.paymentConfig.num_intervals,
            new_minimum_ada: initResult.paymentConfig.minimum_ada,
            is_active: false,
            user_token: initResult.paymentConfig.account_user_token,
            ref_token: initResult.paymentConfig.service_ref_token,
            scripts: serviceScript,
        };

        const updateServiceResult = yield* updateServiceDatum(
            lucid,
            updateServiceConfig,
        );
        const updateServiceSigned = yield* Effect.promise(() =>
            updateServiceResult.sign.withWallet().complete()
        );

        const updateServiceTxHash = yield* Effect.promise(() =>
            updateServiceSigned.submit()
        );

        console.log(
            "Service updated with transaction hash:",
            updateServiceTxHash,
        );

        yield* Effect.sync(() => emulator.awaitBlock(100));

        const serviceScriptAddress = validatorToAddress(
            "Custom",
            serviceValidator.spendService,
        );

        const paymentValidator = readMultiValidators(true, [
            initResult.paymentConfig.service_policyId,
            initResult.paymentConfig.account_policyId,
        ]);

        const paymentScript = {
            spending: paymentValidator.spendPayment.script,
            minting: paymentValidator.mintPayment.script,
            staking: "",
        };

        const paymentPolicyId = mintingPolicyToId(
            paymentValidator.mintPayment,
        );

        const payment_token_name = tokenNameFromUTxO(
            initResult.outputs.paymentValidatorUTxOs,
            paymentPolicyId,
        );

        const paymentNFT = toUnit(
            paymentPolicyId,
            payment_token_name, //tokenNameWithoutFunc,
        );

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        const subscriberUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(users.subscriber.address)
        );

        const serviceScriptUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(serviceScriptAddress)
        );

        const penaltyConfig: CreatePenaltyConfig = {
            service_nft_tn: initResult.paymentConfig.service_nft_tn, //AssetName,
            account_nft_tn: initResult.paymentConfig.account_nft_tn,
            penalty_fee: initResult.paymentConfig.penalty_fee,
            penalty_fee_qty: initResult.paymentConfig.penalty_fee_qty,
            subscriber_token: initResult.paymentConfig.account_user_token,
            payment_token: paymentNFT,
            scripts: paymentScript,
            subscriberUTxO: subscriberUTxOs,
            serviceUTxO: serviceScriptUTxOs,
            paymentUTxO: initResult.outputs.paymentValidatorUTxOs,
        };

        const subscriberWithdrawFlow = Effect.gen(function* (_) {
            const subscriberWithdrawUnsigned = yield* subscriberWithdraw(
                lucid,
                penaltyConfig,
            );
            const subscriberWithdrawSigned = yield* Effect.promise(() =>
                subscriberWithdrawUnsigned.sign.withWallet().complete()
            );

            const subscriberWithdrawTxHash = yield* Effect.promise(() =>
                subscriberWithdrawSigned.submit()
            );

            yield* Effect.sync(() => emulator.awaitBlock(100));
            return subscriberWithdrawTxHash;
        });

        const withdrawResult = yield* subscriberWithdrawFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error withdrawing from Payment Contract: ${error}`)
            ),
            Effect.map((hash) => {
                console.log(
                    "Subscribiption withdrawn successfully. TxHash:",
                    hash,
                );
                return hash;
            }),
        );

        const paymentScriptAddress = validatorToAddress(
            "Custom",
            paymentValidator.spendPayment,
        );
        const paymentUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(paymentScriptAddress)
        );

        const paymentConfig = initResult.paymentConfig;

        return {
            txHash: withdrawResult,
            paymentConfig,
            penaltyConfig,
            outputs: {
                paymentUTxOs,
            },
        };
    });
};

test<LucidContext>("Test 1 - Subscriber Withdraw", async (
    context: LucidContext,
) => {
    const result = await Effect.runPromise(
        subscriberWithdrawTestCase(context),
    );

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
});
