import {
  Address,
  Constr,
  Data,
  LucidEvolution,
  RedeemerBuilder,
  toUnit,
  TransactionError,
  TxSignBuilder,
  UTxO,
} from "@lucid-evolution/lucid"
import { ExtendPaymentConfig } from "../core/types.js"
import { Installment, PaymentDatum, PaymentValidatorDatum } from "../core/contract.types.js"
import { getMultiValidator } from "../core/index.js"
import { Effect } from "effect"
import { tokenNameFromUTxO } from "../core/utils/assets.js"
import { getPaymentValidatorDatum, getServiceValidatorDatum } from "./utils.js"
import {
  accountPolicyId,
  paymentPolicyId,
  paymentScript,
  servicePolicyId,
} from "../core/validators/constants.js"

export const extendSubscriptionProgram = (
  lucid: LucidEvolution,
  config: ExtendPaymentConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () {
    const subscriberAddress: Address = yield* Effect.promise(() => lucid.wallet().address())

    const paymentValidator = getMultiValidator(lucid, paymentScript)

    const serviceNFT = toUnit(servicePolicyId, config.service_nft_tn)
    const subscriberNFT = toUnit(accountPolicyId, config.subscriber_nft_tn)

    const serviceUTxO = yield* Effect.promise(() => lucid.utxoByUnit(serviceNFT))
    const paymentUTxOs = yield* Effect.promise(() => lucid.utxosAt(paymentValidator.spendValAddress))

    const result = paymentUTxOs
      .flatMap((utxo) => getPaymentValidatorDatum(utxo).map<[UTxO, PaymentDatum]>((datum) => [utxo, datum]))
      .find(([_, datum]) => datum.service_nft_tn === config.service_nft_tn && datum.subscriber_nft_tn === config.subscriber_nft_tn)

    if (!result) {
      throw new Error("No active subscription found")
    }
    const [paymentUTxO, oldPaymentDatum] = result

    const paymentNftTn = tokenNameFromUTxO([paymentUTxO], paymentPolicyId)
    const paymentNFT = toUnit(paymentPolicyId, paymentNftTn)

    const serviceData = getServiceValidatorDatum(serviceUTxO)
    if (!serviceData || !serviceData.length) {
      throw new Error("Service not found")
    }
    const serviceDatum = serviceData[0]

    const paymentDatum: PaymentDatum = {
      service_nft_tn: oldPaymentDatum.service_nft_tn,
      subscriber_nft_tn: oldPaymentDatum.subscriber_nft_tn,
      subscription_start: oldPaymentDatum.subscription_start,
      subscription_end: oldPaymentDatum.subscription_end + (config.extension_intervals * serviceDatum.interval_length),
      original_subscription_end: oldPaymentDatum.original_subscription_end,
      installments: oldPaymentDatum.installments.concat(Array.from(
        { length: Number(config.extension_intervals) },
        (_, i) =>
          ({
            claimable_at: oldPaymentDatum.subscription_end + (serviceDatum.interval_length * BigInt(i + 1)),
            claimable_amount: serviceDatum.service_fee,
          }) as Installment,
      ))
    }

    const newTotalSubscriptionFee = paymentUTxO.assets.lovelace + config.extension_intervals * serviceDatum.service_fee

    const allDatums: PaymentValidatorDatum = { Payment: [paymentDatum] }
    const paymentValDatum = Data.to<PaymentValidatorDatum>(allDatums, PaymentValidatorDatum)

    const extendRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        const result = Data.to(new Constr(0, [0n, inputIndices[0], 1n, config.extension_intervals]))
        return result
      },
      inputs: [paymentUTxO],
    }

    const tx = yield* lucid
      .newTx()
      .collectFrom([paymentUTxO], extendRedeemer)
      .readFrom([serviceUTxO])
      .pay.ToAddress(subscriberAddress, { [subscriberNFT]: 1n })
      .pay.ToAddressWithData(paymentValidator.spendValAddress, {
        kind: "inline",
        value: paymentValDatum,
      }, {
        lovelace: newTotalSubscriptionFee,
        [paymentNFT]: 1n,
      })
      .attach.SpendingValidator(paymentValidator.spendValidator)
      .completeProgram()

    return tx
  })
