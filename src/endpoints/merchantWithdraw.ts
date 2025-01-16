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

    const paymentNFT = toUnit(
      paymentPolicyId,
      config.payment_nft_tn, //tokenNameWithoutFunc,
    );

    // TODO: Filter through the transaction requirements.
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
      () => (getPaymentValidatorDatum(paymentUTxO)),
    );

    const calculateWithdrawal = (
      currentTime: bigint,
      paymentData: PaymentDatum,
    ) => {
      // Calculate time since last claim
      const timeSinceLastClaim = currentTime > paymentData.last_claimed
        ? currentTime - paymentData.last_claimed
        : BigInt(0);

      // Calculate time remaining until subscription end
      const timeUntilEnd = paymentData.subscription_end - currentTime;

      // Calculate intervals based on both time since last claim and remaining intervals
      const intervalsPassed = Number(timeSinceLastClaim) /
        Number(paymentData.interval_length);

      // Consider both passed intervals and remaining intervals
      let claimableIntervals = Math.min(
        intervalsPassed,
        Number(paymentData.num_intervals),
      );

      // If this is potentially the final interval, check remaining funds
      if (
        paymentData.num_intervals <= 1n &&
        timeUntilEnd <= paymentData.interval_length
      ) {
        claimableIntervals = Math.max(1, claimableIntervals);
      }

      const withdrawableAmount = BigInt(Math.floor(claimableIntervals)) *
        paymentData.interval_amount;

      // Debug logging
      console.log("Current Time:", currentTime);
      console.log("Subscription Start:", paymentData.subscription_start);
      console.log("Subscription End:", paymentData.subscription_end);
      console.log("Last Claimed:", paymentData.last_claimed);
      console.log("timeSinceLastClaim:", timeSinceLastClaim);
      console.log("timeUntilEnd:", timeUntilEnd);
      console.log("Interval Length:", paymentData.interval_length);
      console.log("Number of Intervals:", paymentData.num_intervals);
      console.log("intervalsPassed:", intervalsPassed);
      console.log("claimableIntervals:", claimableIntervals);

      return {
        withdrawableAmount,
        intervalsToWithdraw: Math.floor(claimableIntervals),
      };
    };

    // Debug time values

    const { withdrawableAmount, intervalsToWithdraw } = calculateWithdrawal(
      config.current_time,
      paymentData[0],
    );

    console.log(
      "paymentData[0].subscription_fee_qty: ",
      paymentData[0].subscription_fee_qty,
    );

    console.log(
      "paymentUTxO.assets : ",
      paymentUTxO.assets["lovelace"],
    );

    // Calculate remaining subscription fee after withdrawal
    const payment_value = paymentUTxO.assets["lovelace"];
    const minimum_ada = paymentData[0].minimum_ada;

    let withdrawnAmount = 0n;
    if ((payment_value - withdrawableAmount) > minimum_ada) {
      withdrawnAmount = withdrawableAmount;
    } else {
      withdrawnAmount = withdrawableAmount - minimum_ada;
    }

    const newTotalSubscriptionFee = paymentUTxO.assets["lovelace"] -
      withdrawnAmount;

    const newNumIntervals = paymentData[0].num_intervals -
      BigInt(intervalsToWithdraw);
    console.log("withdrawnAmount Amount: ", withdrawnAmount);
    console.log("interval_amount: ", paymentData[0].interval_amount);
    console.log("intervalsToWithdraw: ", intervalsToWithdraw);

    const paymentDatum: PaymentDatum = {
      service_nft_tn: paymentData[0].service_nft_tn,
      subscriber_nft_tn: paymentData[0].subscriber_nft_tn,
      subscription_fee: paymentData[0].subscription_fee,
      subscription_fee_qty: newTotalSubscriptionFee,
      subscription_start: paymentData[0].subscription_start,
      subscription_end: paymentData[0].subscription_end,
      interval_length: paymentData[0].interval_length,
      interval_amount: paymentData[0].interval_amount,
      num_intervals: newNumIntervals,
      last_claimed: config.current_time,
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

    console.log("paymentValDatum: ", paymentValDatum);

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
    if (withdrawableAmount < paymentData[0].minimum_ada) {
      console.error("Not enough Withdrawable Amount: ", withdrawableAmount);
    }
    console.log("newTotalSubscriptionFee: ", newTotalSubscriptionFee);

    // TODO input-payment - withdrawable amoun = newTotalSubscriptionFrr

    const tx = yield* lucid
      .newTx()
      .collectFrom(merchantUTxOs)
      .collectFrom([paymentUTxO], merchantWithdrawRedeemer)
      .readFrom([serviceUTxO])
      .pay.ToAddress(merchantAddress, {
        lovelace: withdrawnAmount, // Payment output
        [merchantNft]: 1n,
      })
      .pay.ToContract(validators.spendValAddress, {
        kind: "inline",
        value: paymentValDatum,
      }, {
        lovelace: newTotalSubscriptionFee,
        [paymentNFT]: 1n,
      })
      .validFrom(Number(config.current_time) - Number(1000 * 60)) // 1 minute
      .attach.SpendingValidator(validators.spendValidator)
      .completeProgram();

    return tx;
  });
