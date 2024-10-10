import {
    merchantPenaltyWithdraw,
    toUnit,
    WithdrawPenaltyConfig,
} from "../src/index.js";
import { expect, test } from "vitest";
import { mintingPolicyToId } from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { tokenNameFromUTxO } from "../src/core/utils/assets.js";
import { subscriberWithdrawTestCase } from "./subscriber-withdraw.test.js";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { LucidContext, makeLucidContext } from "./emulator/service.js";

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
    const program = Effect.gen(function* ($) {
        const context = yield* makeLucidContext;
        const result = yield* withdrawPenaltyTestCase(context);
        return result;
    });
    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
    expect(result.withdrawConfig).toBeDefined();
});
