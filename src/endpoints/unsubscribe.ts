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
import {
    accountPolicyId,
    paymentPolicyId,
    paymentScript,
    servicePolicyId,
} from "../core/validators/constants.js";

export const unsubscribeProgram = (
    lucid: LucidEvolution,
    config: UnsubscribeConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () {
        const subscriberAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        const paymentValidators = getMultiValidator(
            lucid,
            paymentScript,
        );
        const paymentAddress = paymentValidators.spendValAddress;

        const paymentUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(paymentAddress)
        );

        // const payment_token_name = tokenNameFromUTxO(
        //     paymentUTxOs,
        //     paymentPolicyId,
        // );

        const paymentNFT = toUnit(
            paymentPolicyId,
            config.payment_nft_tn,
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

        const serviceRefNft = toUnit(
            servicePolicyId,
            config.service_nft_tn,
        );

        const subscriberNft = toUnit(
            accountPolicyId,
            config.subscriber_nft_tn,
        );

        const serviceUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                serviceRefNft,
            )
        );

        const subscriberUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                subscriberNft,
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
            () => (getPaymentValidatorDatum(paymentUTxO)),
        );

        const total_subscription_time = BigInt(
            paymentData[0].subscription_end - paymentData[0].subscription_start,
        );

        const currentTime = BigInt(Date.now());

        const time_elapsed = BigInt(
            Math.min(
                Number(currentTime - paymentData[0].subscription_start),
                Number(total_subscription_time),
            ),
        );

        const refund_amount = paymentData[0].subscription_fee_qty *
            (total_subscription_time - time_elapsed) / total_subscription_time;

        const penaltyDatum: PenaltyDatum = {
            service_nft_tn: config.service_nft_tn,
            subscriber_nft_tn: config.subscriber_nft_tn,
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
            inputs: [subscriberUTxO, paymentUTxO],
        };

        const tx = yield* lucid
            .newTx()
            .collectFrom(selectedUTxOs)
            .readFrom([serviceUTxO])
            .collectFrom([paymentUTxO], unsubscribeRedeemer)
            .pay.ToAddress(subscriberAddress, {
                lovelace: refund_amount,
                [subscriberNft]: 1n,
            })
            .pay.ToAddressWithData(paymentAddress, {
                kind: "inline",
                value: penaltyValDatum,
            }, {
                [paymentNFT]: 1n,
            })
            .validFrom(Number(paymentData[0].subscription_start)) // 1 minute
            .attach.SpendingValidator(paymentValidators.spendValidator)
            .completeProgram();

        return tx;
    });
