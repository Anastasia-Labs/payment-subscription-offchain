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

    const currentTime = BigInt(Date.now()) + BigInt(1000 * 60 * 1); // 1 minute

    const paymentData = yield* Effect.promise(
      () => (getPaymentValidatorDatum(paymentUTxO)),
    );

    // Calculate withdrawable amount based on time elapsed since last claim
    const calculateWithdrawal = (
      currentTime: bigint,
      paymentData: PaymentDatum,
    ) => {
      if (currentTime < paymentData.subscription_start) {
        return {
          withdrawableAmount: BigInt(0),
          intervalsToWithdraw: 0,
        };
      }

      // Debug time values
      console.log("Current Time:", currentTime);
      console.log("Subscription Start:", paymentData.subscription_start);
      console.log("Last Claimed:", paymentData.last_claimed);
      console.log("Interval Length:", paymentData.interval_length);
      console.log("Number of Intervals:", paymentData.num_intervals);

      const timeElapsed = currentTime - paymentData.subscription_start;
      console.log("Time Elapsed:", timeElapsed);

      // Calculate complete intervals
      const completeIntervals = Math.floor(
        Number(timeElapsed) / Number(paymentData.interval_length),
      );
      console.log("Complete Intervals:", completeIntervals);

      // Ensure last_claimed is not before subscription_start
      const lastClaimedTime =
        paymentData.last_claimed < paymentData.subscription_start
          ? paymentData.subscription_start
          : paymentData.last_claimed;

      const claimedIntervals = Math.floor(
        Number(lastClaimedTime - paymentData.subscription_start) /
          Number(paymentData.interval_length),
      );
      console.log("Claimed Intervals:", claimedIntervals);

      // Calculate withdrawable intervals
      const intervalsToWithdraw = Math.max(
        0,
        completeIntervals - claimedIntervals,
      );
      console.log("Intervals To Withdraw:", intervalsToWithdraw);

      const withdrawableAmount = BigInt(intervalsToWithdraw) *
        paymentData.interval_amount;

      return {
        withdrawableAmount,
        intervalsToWithdraw,
      };
    };

    const { withdrawableAmount, intervalsToWithdraw } = calculateWithdrawal(
      currentTime,
      paymentData[0],
    );

    // Calculate remaining subscription fee after withdrawal
    const newTotalSubscriptionFee = paymentData[0].total_subscription_fee -
      withdrawableAmount;

    // const intervals = BigInt(1); // Number of intervals
    // const interval_amount = paymentData[0].interval_amount *
    //   intervals;
    // const newTotalSubscriptionFee = paymentData[0].total_subscription_fee +
    //   (interval_amount * intervals);
    const newNumIntervals = paymentData[0].num_intervals -
      BigInt(intervalsToWithdraw);
    console.log("Withdrawable Amount: ", withdrawableAmount);
    console.log("intervalsToWithdraw: ", intervalsToWithdraw);
    // const withdrawal_period = paymentData[0].interval_length *
    //   intervals;

    // const newSubscriptionEnd = paymentData[0].subscription_end +
    //   withdrawal_period;

    const paymentDatum: PaymentDatum = {
      service_nft_tn: paymentData[0].service_nft_tn,
      subscriber_nft_tn: paymentData[0].subscriber_nft_tn,
      subscription_fee: paymentData[0].subscription_fee,
      total_subscription_fee: newTotalSubscriptionFee,
      subscription_start: paymentData[0].subscription_start,
      subscription_end: paymentData[0].subscription_end,
      interval_length: paymentData[0].interval_length,
      interval_amount: paymentData[0].interval_amount,
      num_intervals: newNumIntervals,
      last_claimed: currentTime,
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
        lovelace: withdrawableAmount + paymentData[0].minimum_ada,
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
