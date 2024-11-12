import {
    Address,
    Constr,
    Data,
    LucidEvolution,
    RedeemerBuilder,
    selectUTxOs,
    TransactionError,
    TxBuilderError,
    TxSignBuilder,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { UnsubscribeConfig, UpdateServiceConfig } from "../core/types.js";
import {
    PaymentValidatorDatum,
    PenaltyDatum,
    ServiceDatum,
} from "../core/contract.types.js";
import { Effect } from "effect";
import { extractTokens } from "./utils.js";

export const unsubscribeService = (
    lucid: LucidEvolution,
    config: UnsubscribeConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () {
        const subscriberAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        // const serviceValidators = getMultiValidator(
        //     lucid,
        //     config.service_scripts,
        // );
        const paymentValidators = getMultiValidator(
            lucid,
            config.payment_scripts,
        );
        // const serviceValAddress = serviceValidators.spendValAddress;
        const paymentAddress = paymentValidators.spendValAddress;

        const subscriberUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(subscriberAddress)
        );

        const selectedUTxOs = selectUTxOs(subscriberUTxOs, {
            ["lovelace"]: 2000000n,
        });

        console.log("selectedUTxOs UTxOs: ", selectedUTxOs);

        const paymentUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                config.payment_token,
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

        const penaltyDatum: PenaltyDatum = {
            service_nft_tn: config.service_nft_tn,
            account_nft_tn: config.account_nft_tn,
            penalty_fee: config.penalty_fee,
            penalty_fee_qty: config.penalty_fee_qty,
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

        console.log(
            "Update Service Datum subscriberUTxO UTxOs>>>: \n",
            subscriberUTxO,
        );
        console.log(
            "Update Service Datum serviceUTxO UTxOs>>>: \n",
            serviceUTxO,
        );

        console.log(
            "Refund >>>: \n",
            config.refund_amount,
        );

        const tx = yield* lucid
            .newTx()
            .collectFrom(selectedUTxOs)
            .readFrom([serviceUTxO])
            .collectFrom([paymentUTxO], unsubscribeRedeemer)
            .pay.ToAddress(subscriberAddress, {
                lovelace: config.refund_amount,
                [config.user_token]: 1n,
            })
            .pay.ToAddressWithData(paymentAddress, {
                kind: "inline",
                value: penaltyValDatum,
            }, {
                [config.payment_token]: 1n,
            })
            .validFrom(Number(config.subscription_start)) // 1 minute
            .attach.SpendingValidator(paymentValidators.spendValidator)
            .completeProgram();

        return tx;
    });
