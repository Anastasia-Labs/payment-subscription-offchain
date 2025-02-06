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
import {
    findSubscriptionTokenNames,
    findUnsubscribePaymentUTxO,
    getPaymentValidatorDatum,
} from "./utils.js";
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
        const finalCurrentTime = config.current_time - BigInt(6000 * 3);
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

        const { serviceNftTn, paymentNftTn } = yield* Effect.promise(() =>
            findSubscriptionTokenNames(
                paymentUTxOs,
                config.subscriber_nft_tn,
                paymentPolicyId,
            )
        );

        // const payment_token_name = tokenNameFromUTxO(
        //     paymentUTxOs,
        //     paymentPolicyId,
        // );

        const paymentNFT = toUnit(
            paymentPolicyId,
            paymentNftTn,
        );

        const subscriberUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(subscriberAddress)
        );

        const selectedUTxOs = selectUTxOs(subscriberUTxOs, {
            ["lovelace"]: 2000000n,
        });

        // const paymentUTxO = yield* findUnsubscribePaymentUTxO(
        //     paymentUTxOs,
        //     config.service_nft_tn,
        //     config.subscriber_nft_tn,
        // );

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
            serviceNftTn,
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

        const time_elapsed = BigInt(
            Math.min(
                Number(finalCurrentTime - paymentData[0].subscription_start),
                Number(total_subscription_time),
            ),
        );

        // const refund_amount = paymentData[0].total_subscription_fee_qty *
        //     (total_subscription_time - time_elapsed) / total_subscription_time;
        const refundable_amount = paymentData[0].num_intervals *
            paymentData[0].interval_amount;

        const subscriber_refund = refundable_amount -
            paymentData[0].penalty_fee_qty - paymentData[0].minimum_ada;

        const penaltyDatum: PenaltyDatum = {
            service_nft_tn: serviceNftTn,
            subscriber_nft_tn: config.subscriber_nft_tn,
            penalty_fee: paymentData[0].penalty_fee,
            penalty_fee: paymentData[0].penalty_fee_qty,
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

        console.log("subscriberUTxOs: ", subscriberUTxOs);

        const tx = yield* lucid
            .newTx()
            .collectFrom([subscriberUTxO])
            .readFrom([serviceUTxO])
            .collectFrom([paymentUTxO], unsubscribeRedeemer)
            .pay.ToAddress(subscriberAddress, {
                lovelace: subscriber_refund,
                [subscriberNft]: 1n,
            })
            .pay.ToAddressWithData(paymentAddress, {
                kind: "inline",
                value: penaltyValDatum,
            }, {
                lovelace: paymentData[0].penalty_fee_qty + 1_000_000n,
                [paymentNFT]: 1n,
            })
            .validFrom(Number(paymentData[0].subscription_start)) // 1 minute
            .attach.SpendingValidator(paymentValidators.spendValidator)
            .completeProgram();

        return tx;
    });
