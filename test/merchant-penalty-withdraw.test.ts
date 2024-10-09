import {
    Emulator,
    generateEmulatorAccount,
    Lucid,
    LucidEvolution,
    merchantPenaltyWithdraw,
    toUnit,
    WithdrawPenaltyConfig,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import {
    mintingPolicyToId,
    PROTOCOL_PARAMETERS_DEFAULT,
} from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { tokenNameFromUTxO } from "../src/core/utils/assets.js";
import { subscriberWithdrawTestCase } from "./subscriber-withdraw.test.js";
import blueprint from "./compiled/plutus.json" assert { type: "json" };

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

type MerchantPenaltyResult = {
    txHash: string;
    withdrawConfig: WithdrawPenaltyConfig;
};

export const withdrawPenaltyTestCase = (
    { lucid, users, emulator }: LucidContext,
): Effect.Effect<MerchantPenaltyResult, Error, never> => {
    return Effect.gen(function* () {
        const initResult = yield* subscriberWithdrawTestCase({
            lucid,
            users,
            emulator,
        });

        expect(initResult).toBeDefined();
        expect(typeof initResult.txHash).toBe("string");

        yield* Effect.sync(() => emulator.awaitBlock(100));

        const paymentValidator = readMultiValidators(blueprint, true, [
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
            initResult.penaltyConfig.paymentUTxO,
            paymentPolicyId,
        );

        const paymentNFT = toUnit(
            paymentPolicyId,
            payment_token_name, //tokenNameWithoutFunc,
        );

        lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

        const merchantUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(users.merchant.address)
        );

        const withdrawPenaltyConfig: WithdrawPenaltyConfig = {
            service_nft_tn: initResult.penaltyConfig.service_nft_tn, //AssetName,
            account_nft_tn: initResult.penaltyConfig.account_nft_tn,
            penalty_fee: initResult.penaltyConfig.penalty_fee,
            penalty_fee_qty: initResult.penaltyConfig.penalty_fee_qty,
            merchant_token: initResult.paymentConfig.service_user_token,
            service_ref_token: initResult.paymentConfig.service_ref_token,
            payment_token: paymentNFT,
            scripts: paymentScript,
            merchantUTxO: merchantUTxOs,
            serviceUTxO: initResult.penaltyConfig.serviceUTxO,
            paymentUTxO: initResult.outputs.paymentUTxOs,
        };

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

test<LucidContext>("Test 1 - Merchant Penalty Withdraw", async (
    context: LucidContext,
) => {
    const result = await Effect.runPromise(withdrawPenaltyTestCase(context));

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");

    expect(result.withdrawConfig).toBeDefined();
});
