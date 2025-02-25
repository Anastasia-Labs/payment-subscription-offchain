import {
  Assets,
  Constr,
  Data,
  fromText,
  LucidEvolution,
  RedeemerBuilder,
  toUnit,
  TransactionError,
  TxSignBuilder,
} from "@lucid-evolution/lucid"
import { SubscriberWithdrawConfig } from "../core/types.js"
import { getMultiValidator, PAYMENT_TOKEN_NAME } from "../core/index.js"
import { Effect } from "effect"
import {
  accountPolicyId,
  paymentPolicyId,
  paymentScript,
  servicePolicyId,
} from "../core/validators/constants.js"
import { findPaymentToWithdraw } from "./utils.js"

export const subscriberWithdrawProgram = (
  lucid: LucidEvolution,
  config: SubscriberWithdrawConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () {
    const subscriberAddress = yield* Effect.promise(() => lucid.wallet().address())
    const validators = getMultiValidator(lucid, paymentScript)

    const paymentAddress = validators.spendValAddress
    const paymentUTxOs = yield* Effect.promise(() => lucid.utxosAt(paymentAddress))
    const { paymentUTxO } = findPaymentToWithdraw(paymentUTxOs, config.service_nft_tn, config.subscriber_nft_tn)
    const paymentNft = toUnit(paymentPolicyId, fromText(PAYMENT_TOKEN_NAME))

    const subscriberNft = toUnit(accountPolicyId, config.subscriber_nft_tn)
    const subscriberUTxO = yield* Effect.promise(() => lucid.utxoByUnit(subscriberNft))

    const paymentValue = paymentUTxO.assets.lovelace

    const serviceRefNft = toUnit(servicePolicyId, config.service_nft_tn)
    const serviceUTxO = yield* Effect.promise(() => lucid.utxoByUnit(serviceRefNft))

    const subscriberWithdrawRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        return Data.to(new Constr(3, [0n, inputIndices[0], inputIndices[1]]))
      },
      inputs: [subscriberUTxO, paymentUTxO],
    }

    const mintingAssets: Assets = {
      [paymentNft]: -1n
    }
    const mintingRedeemer = Data.to(new Constr(1, []))

    const tx = yield* lucid
      .newTx()
      .collectFrom([subscriberUTxO])
      .collectFrom([paymentUTxO], subscriberWithdrawRedeemer)
      .readFrom([serviceUTxO])
      .pay.ToAddress(subscriberAddress, {
        lovelace: paymentValue,
        [subscriberNft]: 1n,
      })
      .mintAssets(mintingAssets, mintingRedeemer)
      .attach.SpendingValidator(validators.spendValidator)
      .attach.MintingPolicy(validators.mintValidator)
      .completeProgram()

    return tx
  })
