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
import { getPaymentValidatorDatum } from "./utils.js";
import { tokenNameFromUTxO } from "../core/utils/assets.js";
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

    const payment_token_name = tokenNameFromUTxO(
      paymentUTxOs,
      paymentPolicyId,
    );

    const paymentNFT = toUnit(
      paymentPolicyId,
      payment_token_name, //tokenNameWithoutFunc,
    );

    const paymentUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        paymentNFT,
      )
    );

    const merchantUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(merchantAddress)
    );

    const serviceRefNft = toUnit(
      servicePolicyId,
      config.service_nft_tn,
    );

    const merchantNft = toUnit(
      servicePolicyId,
      config.merchant_nft_tn,
    );

    const merchantUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        merchantNft,
      )
    );

    const serviceUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        serviceRefNft,
      )
    );

    const paymentData = yield* Effect.promise(
      () => (getPaymentValidatorDatum(paymentUTxOs)),
    );

    const extension_intervals = BigInt(1); // Number of intervals to extend
    const interval_amount = paymentData[0].interval_amount *
      extension_intervals;
    const newTotalSubscriptionFee = paymentData[0].total_subscription_fee +
      (interval_amount * extension_intervals);
    const newNumIntervals = paymentData[0].num_intervals +
      extension_intervals;
    const extension_period = paymentData[0].interval_length *
      extension_intervals;

    const newSubscriptionEnd = paymentData[0].subscription_end +
      extension_period;

    const paymentDatum: PaymentDatum = {
      service_nft_tn: paymentData[0].service_nft_tn,
      account_nft_tn: paymentData[0].account_nft_tn,
      subscription_fee: paymentData[0].subscription_fee,
      total_subscription_fee: newTotalSubscriptionFee,
      subscription_start: paymentData[0].subscription_start,
      subscription_end: newSubscriptionEnd,
      interval_length: paymentData[0].interval_length,
      interval_amount: interval_amount,
      num_intervals: newNumIntervals,
      last_claimed: config.last_claimed,
      penalty_fee: paymentData[0].penalty_fee,
      penalty_fee_qty: paymentData[0].penalty_fee_qty,
      minimum_ada: paymentData[0].minimum_ada,
    };

    const allDatums: PaymentValidatorDatum = {
      Payment: [paymentDatum],
    };

    const paymentValDatum = Data.to<PaymentValidatorDatum>(
      allDatums,
      PaymentValidatorDatum,
    );

    const merchantWithdrawRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        // Construct the redeemer using the input indices
        const merchantIndex = inputIndices[0];
        const paymentIndex = inputIndices[1];

        return Data.to(
          new Constr(1, [
            new Constr(1, [BigInt(merchantIndex), BigInt(paymentIndex)]),
          ]),
        );
      },
      // Specify the inputs relevant to the redeemer
      inputs: [merchantUTxO, paymentUTxO],
    };

    const tx = yield* lucid
      .newTx()
      .collectFrom(merchantUTxOs)
      .collectFrom([paymentUTxO], merchantWithdrawRedeemer)
      .readFrom([serviceUTxO])
      .pay.ToAddress(merchantAddress, {
        lovelace: paymentData[0].minimum_ada,
        [merchantNft]: 1n,
      })
      .pay.ToContract(validators.spendValAddress, {
        kind: "inline",
        value: paymentValDatum,
      }, {
        lovelace: newTotalSubscriptionFee,
        [paymentNFT]: 1n,
      })
      .validFrom(Number(paymentData[0].subscription_start) + Number(1000 * 60)) // 1 minute
      .attach.SpendingValidator(validators.spendValidator)
      .completeProgram();

    return tx;
  });
