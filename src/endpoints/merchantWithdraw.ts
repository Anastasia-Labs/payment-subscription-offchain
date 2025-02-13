import {
  Address,
  Constr,
  Data,
  LucidEvolution,
  RedeemerBuilder,
  toUnit,
  TransactionError,
  TxSignBuilder,
} from "@lucid-evolution/lucid";
import { MerchantWithdrawConfig } from "../core/types.js";
import { PaymentDatum, PaymentValidatorDatum } from "../core/contract.types.js";
import { getMultiValidator } from "../core/index.js";
import { Effect } from "effect";
import {
  calculateClaimableIntervals,
  findPaymentToWithdraw,
} from "./utils.js";
import {
  paymentPolicyId,
  paymentScript,
  servicePolicyId,
} from "../core/validators/constants.js";

export const merchantWithdrawProgram = (
  lucid: LucidEvolution,
  config: MerchantWithdrawConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () {
    const merchantAddress: Address = yield* Effect.promise(() => lucid.wallet().address());

    const validators = getMultiValidator(lucid, paymentScript);

    const paymentUTxOs = yield* Effect.promise(() => lucid.utxosAt(validators.spendValAddress));
    const merchantUTxOs = yield* Effect.promise(() => lucid.utxosAt(merchantAddress));

    const serviceRefNft = toUnit(servicePolicyId, config.service_nft_tn);
    const merchantNft = toUnit(servicePolicyId, config.merchant_nft_tn);

    const merchantUTxO = yield* Effect.promise(() => lucid.utxoByUnit(merchantNft));
    const serviceUTxO = yield* Effect.promise(() => lucid.utxoByUnit(serviceRefNft));

    const { paymentNftTn, paymentUTxO, paymentDatum } = yield* Effect.promise(() =>
      findPaymentToWithdraw(
        paymentUTxOs,
        config.service_nft_tn,
        config.subscriber_nft_tn,
        paymentPolicyId,
      )
    );

    const paymentNFT = toUnit(paymentPolicyId, paymentNftTn);

    const { withdrawableAmount, withdrawableCount, newInstallments } =
      calculateClaimableIntervals(config.current_time, paymentDatum);

    const newPaymentDatum: PaymentDatum = {
      service_nft_tn: paymentDatum.service_nft_tn,
      subscriber_nft_tn: paymentDatum.subscriber_nft_tn,
      subscription_start: paymentDatum.subscription_start,
      subscription_end: paymentDatum.subscription_end,
      original_subscription_end: paymentDatum.original_subscription_end,
      installments: newInstallments,
    };

    const allDatums: PaymentValidatorDatum = {
      Payment: [newPaymentDatum],
    };

    const paymentValDatum = Data.to<PaymentValidatorDatum>(
      allDatums,
      PaymentValidatorDatum,
    );

    const merchantWithdrawRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        return Data.to(new Constr(1, [0n, inputIndices[0], inputIndices[1], 1n, BigInt(withdrawableCount)]));
      },
      inputs: [merchantUTxO, paymentUTxO],
    };

    const remainingSubscriptionFee = newInstallments.reduce((acc, i) => acc + i.claimable_amount, 0n)
    const remainingSubscriptionAssets = (remainingSubscriptionFee > 0n ? { lovelace: remainingSubscriptionFee, [paymentNFT]: 1n } : { [paymentNFT]: 1n })
    
    const tx = yield* lucid
      .newTx()
      .collectFrom(merchantUTxOs)
      .collectFrom([paymentUTxO], merchantWithdrawRedeemer)
      .readFrom([serviceUTxO])
      .pay.ToAddress(merchantAddress, {
        lovelace: withdrawableAmount,
        [merchantNft]: 1n,
      })
      .pay.ToContract(validators.spendValAddress, {
        kind: "inline",
        value: paymentValDatum,
      }, remainingSubscriptionAssets)
      .validFrom(Number(config.current_time + BigInt(600)))
      .attach.SpendingValidator(validators.spendValidator)
      .completeProgram({ localUPLCEval: true });

    return tx;
  });
