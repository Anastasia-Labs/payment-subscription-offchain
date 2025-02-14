import {
    Address,
    Constr,
    Data,
    LucidEvolution,
    RedeemerBuilder,
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
    getPaymentValidatorDatum,
    getServiceValidatorDatum,
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
        const subscriberAddress: Address = yield* Effect.promise(() => lucid.wallet().address());
        const paymentValidators = getMultiValidator(lucid, paymentScript);
        const paymentAddress = paymentValidators.spendValAddress;

        const paymentUTxOs = yield* Effect.promise(() => lucid.utxosAt(paymentAddress));

        const { serviceNftTn, paymentNftTn } = yield* Effect.promise(() =>
            findSubscriptionTokenNames(paymentUTxOs, config.subscriber_nft_tn, paymentPolicyId)
        );

        const paymentNFT = toUnit(paymentPolicyId, paymentNftTn);

        const subscriberUTxOs = yield* Effect.promise(() => lucid.utxosAt(subscriberAddress));

        const paymentUTxO = yield* Effect.promise(() => lucid.utxoByUnit(paymentNFT));

        if (!subscriberUTxOs || !subscriberUTxOs.length) {
            yield* Effect.fail(new TxBuilderError({ cause: "No UTxO found at user address: " + subscriberAddress }));
        }

        const serviceRefNft = toUnit(servicePolicyId, serviceNftTn);
        const subscriberNft = toUnit(accountPolicyId, config.subscriber_nft_tn);

        const serviceUTxO = yield* Effect.promise(() => lucid.utxoByUnit(serviceRefNft));
        const subscriberUTxO = yield* Effect.promise(() => lucid.utxoByUnit(subscriberNft));

        if (!serviceUTxO) {
            yield* Effect.fail(new TxBuilderError({ cause: "Service NFT not found " }));
        }

        const serviceData = yield* Effect.promise(() => (getServiceValidatorDatum(serviceUTxO)))
        const serviceDatum = serviceData[0]

        const paymentData = yield* Effect.promise(() => (getPaymentValidatorDatum(paymentUTxO)));
        const paymentDatum = paymentData[0]

        const subscriber_refund = paymentUTxO.assets.lovelace - serviceDatum.penalty_fee

        const penaltyDatum: PenaltyDatum = {
            service_nft_tn: serviceNftTn,
            subscriber_nft_tn: config.subscriber_nft_tn
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
                return Data.to(new Constr(2, [0n, inputIndices[0], inputIndices[1], 1n]));
            },
            inputs: [subscriberUTxO, paymentUTxO],
        };

        const tx = yield* lucid
            .newTx()
            .collectFrom([subscriberUTxO])
            .collectFrom([paymentUTxO], unsubscribeRedeemer)
            .readFrom([serviceUTxO])
            .pay.ToAddress(subscriberAddress, {
                lovelace: subscriber_refund,
                [subscriberNft]: 1n,
            })
            .pay.ToAddressWithData(paymentAddress, {
                kind: "inline",
                value: penaltyValDatum,
            }, {
                lovelace: serviceDatum.penalty_fee,
                [paymentNFT]: 1n,
            })
            .validFrom(Number(paymentDatum.subscription_start))
            .attach.SpendingValidator(paymentValidators.spendValidator)
            .completeProgram({ localUPLCEval: true });

        return tx;
    });
