import {
    Constr,
    Data,
    fromText,
    LucidEvolution,
    RedeemerBuilder,
    toUnit,
    TransactionError,
    TxSignBuilder,
    UTxO,
} from "@lucid-evolution/lucid"
import { getMultiValidator } from "../core/utils/index.js"
import { UnsubscribeConfig } from "../core/types.js"
import { PaymentDatum, PaymentValidatorDatum, PenaltyDatum } from "../core/contract.types.js"
import { Effect } from "effect"
import {
    getPaymentValidatorDatum,
    getServiceValidatorDatum,
} from "./utils.js"
import {
    accountPolicyId,
    paymentPolicyId,
    paymentScript,
    servicePolicyId,
} from "../core/validators/constants.js"
import { PAYMENT_TOKEN_NAME } from "../core/constants.js"

export const unsubscribeProgram = (
    lucid: LucidEvolution,
    config: UnsubscribeConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () {
        const subscriberAddress = yield* Effect.promise(() => lucid.wallet().address())
        const paymentValidators = getMultiValidator(lucid, paymentScript)
        const paymentAddress = paymentValidators.spendValAddress

        const paymentNFT = toUnit(paymentPolicyId, fromText(PAYMENT_TOKEN_NAME))
        const paymentUTxOs = yield* Effect.promise(() => lucid.utxosAt(paymentValidators.spendValAddress))

        const result = paymentUTxOs
          .flatMap((utxo) => getPaymentValidatorDatum(utxo).map<[UTxO, PaymentDatum]>((datum) => [utxo, datum]))
          .find(([_utxo, datum]) => datum.service_nft_tn === config.service_nft_tn && datum.subscriber_nft_tn === config.subscriber_nft_tn)

        if (!result) {
          throw new Error("No active subscription found")
        }

        const [paymentUTxO, paymentDatum] = result

        const serviceRefNft = toUnit(servicePolicyId, config.service_nft_tn)
        const subscriberNft = toUnit(accountPolicyId, config.subscriber_nft_tn)

        const serviceUTxO = yield* Effect.promise(() => lucid.utxoByUnit(serviceRefNft))
        const subscriberUTxO = yield* Effect.promise(() => lucid.utxoByUnit(subscriberNft))

        const serviceData = getServiceValidatorDatum(serviceUTxO)
        if (!serviceData || !serviceData.length) {
            throw new Error("Service not found")
        }
        const serviceDatum = serviceData[0]

        const unsubscribeRedeemer: RedeemerBuilder = {
            kind: "selected",
            makeRedeemer: (inputIndices: bigint[]) => {
                return Data.to(new Constr(2, [0n, inputIndices[0], inputIndices[1], 1n]))
            },
            inputs: [subscriberUTxO, paymentUTxO],
        }

        if (paymentDatum.original_subscription_end <= config.current_time) {
            const tx = yield* lucid
                .newTx()
                .collectFrom([subscriberUTxO])
                .collectFrom([paymentUTxO], unsubscribeRedeemer)
                .readFrom([serviceUTxO])
                .validFrom(Number(config.current_time))
                .mintAssets({ [paymentNFT]: -1n }, Data.to(new Constr(1, [])))
                .attach.SpendingValidator(paymentValidators.spendValidator)
                .attach.MintingPolicy(paymentValidators.mintValidator)
                .completeProgram()
            
            return tx
        } else {
            const subscriber_refund = paymentUTxO.assets.lovelace - serviceDatum.penalty_fee

            const penaltyDatum: PenaltyDatum = {
                service_nft_tn: config.service_nft_tn,
                subscriber_nft_tn: config.subscriber_nft_tn
            }

            const allDatums: PaymentValidatorDatum = { Penalty: [penaltyDatum] }
            const penaltyValDatum = Data.to<PaymentValidatorDatum>(allDatums, PaymentValidatorDatum)

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
                .validFrom(Number(config.current_time))
                .attach.SpendingValidator(paymentValidators.spendValidator)
                .completeProgram()

            return tx
        }
    })
