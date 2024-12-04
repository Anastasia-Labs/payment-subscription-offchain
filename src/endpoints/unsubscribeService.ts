import {
    Address,
    Constr,
    Data,
    LucidEvolution,
    RedeemerBuilder,
    selectUTxOs,
    toUnit,
    TransactionError,
    TxBuilderError,
    TxSignBuilder,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { UnsubscribeConfig } from "../core/types.js";
import { PaymentValidatorDatum, PenaltyDatum } from "../core/contract.types.js";
import { Effect } from "effect";
import { getPaymentValidatorDatum } from "./utils.js";
import { tokenNameFromUTxO } from "../core/utils/assets.js";

export const unsubscribeService = (
    lucid: LucidEvolution,
    config: UnsubscribeConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () {
        const subscriberAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        const paymentValidators = getMultiValidator(
            lucid,
            config.payment_scripts,
        );
        const paymentAddress = paymentValidators.spendValAddress;

        const paymentUTxOs = yield* Effect.promise(() =>
            lucid.config().provider.getUtxos(paymentAddress)
        );

        const payment_token_name = tokenNameFromUTxO(
            paymentUTxOs,
            config.payment_policy_Id,
        );

        const paymentNFT = toUnit(
            config.payment_policy_Id,
            payment_token_name,
        );

        const subscriberUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(subscriberAddress)
        );

        const selectedUTxOs = selectUTxOs(subscriberUTxOs, {
            ["lovelace"]: 2000000n,
        });

        const paymentUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                paymentNFT,
            )
        );

        if (!subscriberUTxOs || !subscriberUTxOs.length) {
            yield* Effect.fail(
                new TxBuilderError({
                    cause: "No UTxO found at user address: " +
                        subscriberAddress,
                }),
            );
        }

        const serviceUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                config.ref_token,
            )
        );

        const subscriberUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                config.user_token,
            )
        );

        if (!serviceUTxO) {
            yield* Effect.fail(
                new TxBuilderError({
                    cause: "Service NFT not found ",
                }),
            );
        }

        const paymentData = yield* Effect.promise(
            () => (getPaymentValidatorDatum(paymentUTxOs)),
        );

        const total_subscription_time = BigInt(
            paymentData[0].subscription_end - paymentData[0].subscription_start,
        );

        const time_elapsed = BigInt(
            Math.min(
                Number(config.currentTime - paymentData[0].subscription_start),
                Number(total_subscription_time),
            ),
        );

        const refund_amount = paymentData[0].total_subscription_fee *
            (total_subscription_time - time_elapsed) / total_subscription_time;

        const penaltyDatum: PenaltyDatum = {
            service_nft_tn: config.service_nft_tn,
            account_nft_tn: config.account_nft_tn,
            penalty_fee: paymentData[0].penalty_fee,
            penalty_fee_qty: paymentData[0].penalty_fee_qty,
        };

        const allDatums: PaymentValidatorDatum = {
            Penalty: [penaltyDatum],
        };

        const penaltyValDatum = Data.to<PaymentValidatorDatum>(
            allDatums,
            PaymentValidatorDatum,
        );

        const unsubscribeRedeemer: RedeemerBuilder = {
            kind: "selected",
            makeRedeemer: (inputIndices: bigint[]) => {
                // Construct the redeemer using the input indices
                const subscriberIndex = inputIndices[0];
                const paymentIndex = inputIndices[1];

                const wrappedRedeemer = Data.to(
                    new Constr(1, [
                        new Constr(2, [
                            BigInt(subscriberIndex),
                            BigInt(paymentIndex),
                        ]),
                    ]),
                );

                return wrappedRedeemer;
            },
            // Specify the inputs relevant to the redeemer
            inputs: [selectedUTxOs[0], paymentUTxO],
        };

        const tx = yield* lucid
            .newTx()
            .collectFrom(selectedUTxOs)
            .readFrom([serviceUTxO])
            .collectFrom([paymentUTxO], unsubscribeRedeemer)
            .pay.ToAddress(subscriberAddress, {
                lovelace: refund_amount,
                [config.user_token]: 1n,
            })
            .pay.ToAddressWithData(paymentAddress, {
                kind: "inline",
                value: penaltyValDatum,
            }, {
                [paymentNFT]: 1n,
            })
            .validFrom(Number(paymentData[0].subscription_start)) // 1 minute
            .attach.SpendingValidator(paymentValidators.spendValidator)
            .completeProgram({
                localUPLCEval: false,
                setCollateral: 0n,
            });

        return tx;
    });
