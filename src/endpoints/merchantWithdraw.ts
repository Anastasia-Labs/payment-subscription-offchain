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
} from "@lucid-evolution/lucid";
import { MerchantWithdrawConfig } from "../core/types.js";
import { PaymentDatum, PaymentValidatorDatum } from "../core/contract.types.js";
import { getMultiValidator, PAYMENT_TOKEN_NAME } from "../core/index.js";
import { Effect } from "effect";
import { calculateClaimableIntervals, findPaymentToWithdraw } from "./utils.js";
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
    const merchantAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const validators = getMultiValidator(lucid, paymentScript);

    const paymentUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(validators.spendValAddress)
    );
    const merchantUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(merchantAddress)
    );

    const serviceRefNft = toUnit(servicePolicyId, config.service_nft_tn);
    const merchantNft = toUnit(servicePolicyId, config.merchant_nft_tn);

    const merchantUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(merchantNft)
    );
    const serviceUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(serviceRefNft)
    );

    const { paymentUTxO, paymentDatum } = findPaymentToWithdraw(
      paymentUTxOs,
      config.service_nft_tn,
      config.subscriber_nft_tn,
    );
    const paymentNFT = toUnit(paymentPolicyId, fromText(PAYMENT_TOKEN_NAME));

    const { withdrawableAmount, withdrawableCount, newInstallments } =
      calculateClaimableIntervals(config.current_time, paymentDatum);
    console.log("paymentDatum: ", paymentDatum);
    console.log("currentTime: ", config.current_time);
    console.log(
      "First installment claimable_at: ",
      paymentDatum.installments[0].claimable_at,
    );
    console.log("withdrawableAmount: ", withdrawableAmount);
    console.log("withdrawableCount: ", withdrawableCount);
    console.log("newInstallments: ", newInstallments);

    const newPaymentDatum: PaymentDatum = {
      service_nft_tn: paymentDatum.service_nft_tn,
      subscriber_nft_tn: paymentDatum.subscriber_nft_tn,
      subscription_start: paymentDatum.subscription_start,
      subscription_end: paymentDatum.subscription_end,
      original_subscription_end: paymentDatum.original_subscription_end,
      installments: newInstallments,
    };

    const allDatums: PaymentValidatorDatum = { Payment: [newPaymentDatum] };
    const paymentValDatum = Data.to<PaymentValidatorDatum>(
      allDatums,
      PaymentValidatorDatum,
    );

    const merchantWithdrawRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        return Data.to(
          new Constr(1, [
            0n,
            inputIndices[0],
            inputIndices[1],
            1n,
            BigInt(withdrawableCount),
          ]),
        );
      },
      inputs: [merchantUTxO, paymentUTxO],
    };

    const remainingSubscriptionFee = newInstallments.reduce(
      (acc, i) => acc + i.claimable_amount,
      0n,
    );
    const remainingSubscriptionAssets = remainingSubscriptionFee > 0n
      ? { lovelace: remainingSubscriptionFee, [paymentNFT]: 1n }
      : { [paymentNFT]: 1n };

    //Note: Throws Trace expect claimable_at < current_time" even when there's a withdrawable count, have to wait a few seconds for it to pass!
    //TODO: Review validity range
    //Note: Has a problem selecting the correct servive NFT when the Subscriber has more than one Subscription to the same service even if it has been set to false by the Merchant.
    //No payment found for service 000643b001989b574236d98c4d31e6d24b7ef099697bbee9d949dd110c939f47
    //TODO: Improve Service NFT selection
    //     -Handle isActive false datum values
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
      .validFrom(Number(config.current_time + BigInt(60000 * 3)))
      .attach.SpendingValidator(validators.spendValidator)
      .completeProgram();

    return tx;
  });
