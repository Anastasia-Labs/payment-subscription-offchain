import {
  Address,
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
import { WithdrawPenaltyConfig } from "../core/types.js"
import { getMultiValidator, PAYMENT_TOKEN_NAME, PenaltyDatum } from "../core/index.js"
import { Effect } from "effect"
import { getServiceValidatorDatum, getPenaltyDatum } from "./utils.js"
import {
  paymentPolicyId,
  paymentScript,
  servicePolicyId,
} from "../core/validators/constants.js"

export const merchantPenaltyWithdrawProgram = (
  lucid: LucidEvolution,
  config: WithdrawPenaltyConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () {
    const merchantAddress: Address = yield* Effect.promise(() => lucid.wallet().address())

    const validators = getMultiValidator(lucid, paymentScript)

    const merchantUTxOs = yield* Effect.promise(() => lucid.utxosAt(merchantAddress))

    const paymentNFT = toUnit(paymentPolicyId, fromText(PAYMENT_TOKEN_NAME))
    const paymentUTxOs = yield* Effect.promise(() => lucid.utxosAt(validators.spendValAddress))

    const result = paymentUTxOs
      .flatMap((utxo) => getPenaltyDatum(utxo).map<[UTxO, PenaltyDatum]>((datum) => [utxo, datum]))
      .find(([_utxo, datum]) => datum.service_nft_tn === config.service_nft_tn && datum.subscriber_nft_tn === config.subscriber_nft_tn)

    if (!result) {
      throw new Error("No active subscription found")
    }

    const [penaltyUTxO, _datum] = result

    const serviceRefNft = toUnit(servicePolicyId, config.service_nft_tn)
    const serviceUTxO = yield* Effect.promise(() => lucid.utxoByUnit(serviceRefNft))
    const serviceData = getServiceValidatorDatum(serviceUTxO)
    if (!serviceData || !serviceData.length) {
      throw new Error("Service not found")
    }
    const serviceDatum = serviceData[0]

    const merchantNft = toUnit(servicePolicyId, config.merchant_nft_tn)
    const merchantUTxO = yield* Effect.promise(() => lucid.utxoByUnit(merchantNft))

    const merchantWithdrawRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        return Data.to(
          new Constr(1, [0n, inputIndices[0], inputIndices[1], 0n, 0n])
        )
      },
      inputs: [merchantUTxO, penaltyUTxO],
    }

    const terminateSubscriptionRedeemer = Data.to(new Constr(1, []))

    const tx = yield* lucid
      .newTx()
      .collectFrom(merchantUTxOs)
      .collectFrom([penaltyUTxO], merchantWithdrawRedeemer)
      .readFrom([serviceUTxO])
      .mintAssets(
        { [paymentNFT]: -1n },
        terminateSubscriptionRedeemer,
      )
      .pay.ToAddress(merchantAddress, {
        lovelace: serviceDatum.penalty_fee,
        [merchantNft]: 1n,
      })
      .attach.MintingPolicy(validators.mintValidator)
      .attach.SpendingValidator(validators.spendValidator)
      .completeProgram({ localUPLCEval: true })

    return tx
  })
