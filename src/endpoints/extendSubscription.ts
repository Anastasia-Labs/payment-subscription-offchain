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
import { ExtendPaymentConfig } from "../core/types.js";
import { PaymentDatum, PaymentValidatorDatum } from "../core/contract.types.js";
import { getMultiValidator } from "../core/index.js";
import { Effect } from "effect";
import { tokenNameFromUTxO } from "../core/utils/assets.js";
import { getPaymentValidatorDatum } from "./utils.js";
import {
  paymentPolicyId,
  paymentScript,
} from "../core/validators/constants.js";

export const extendSubscription = (
  lucid: LucidEvolution,
  config: ExtendPaymentConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () { // return type ,
    const subscriberAddress: Address = yield* Effect.promise(() =>
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

    // const subscriberUTxOs = yield* Effect.promise(() =>
    //   lucid.utxosAt(subscriberAddress)
    // );

    // if (!subscriberUTxOs || !subscriberUTxOs.length) {
    //   console.error("No UTxO found at user address: " + subscriberAddress);
    // }

    const subscriberUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        config.acc_user_token,
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
      last_claimed: paymentData[0].last_claimed,
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

    const extendRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        // Construct the redeemer using the input indices
        const subscriberIndex = inputIndices[0];
        const paymentIndex = inputIndices[1];

        return Data.to(
          new Constr(1, [
            new Constr(0, [
              BigInt(subscriberIndex),
              BigInt(paymentIndex),
            ]),
          ]),
        );
      },
      // Specify the inputs relevant to the redeemer
      inputs: [subscriberUTxO, paymentUTxO],
    };

    const tx = yield* lucid
      .newTx()
      .readFrom(config.service_utxos)
      .collectFrom([subscriberUTxO]) // subscriber user nft utxo
      .collectFrom(paymentUTxOs, extendRedeemer) // subscriber utxos
      .pay.ToAddress(subscriberAddress, {
        [config.acc_user_token]: 1n,
      })
      .pay.ToAddressWithData(validators.spendValAddress, {
        kind: "inline",
        value: paymentValDatum,
      }, {
        lovelace: newTotalSubscriptionFee,
        [paymentNFT]: 1n,
      })
      .attach.SpendingValidator(validators.spendValidator)
      .completeProgram();

    return tx;
  });
