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
  accountPolicyId,
  paymentPolicyId,
  paymentScript,
  servicePolicyId,
} from "../core/validators/constants.js";

export const extendSubscriptionProgram = (
  lucid: LucidEvolution,
  config: ExtendPaymentConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () { // return type ,
    const subscriberAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const paymentValidator = getMultiValidator(lucid, paymentScript);

    const serviceNFT = toUnit(
      servicePolicyId,
      config.service_nft_tn, //tokenNameWithoutFunc,
    );

    const subscriberNFT = toUnit(
      accountPolicyId,
      config.subscriber_nft_tn,
    );

    const serviceUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        serviceNFT,
      )
    );

    const subscriberUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        subscriberNFT,
      )
    );

    const paymentUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(paymentValidator.spendValAddress)
    );

    const results = yield* Effect.forEach(
      paymentUTxOs,
      (utxo) =>
        Effect.tryPromise(() => getPaymentValidatorDatum(utxo)).pipe(
          Effect.map((datum) =>
            datum[0].service_nft_tn === config.service_nft_tn &&
              datum[0].subscriber_nft_tn === config.subscriber_nft_tn
              ? utxo
              : null
          ),
          Effect.catchAll(() => Effect.succeed(null)),
        ),
    );

    const paymentUTxO = results.find((utxo) => utxo !== null);
    if (!paymentUTxO) {
      throw new Error("No active subscription found");
    }

    console.log("paymentUTxO: ", paymentUTxO);

    // Get payment NFT token name from the relevant UTxO
    const paymentNftTn = tokenNameFromUTxO([paymentUTxO], paymentPolicyId);

    const paymentNFT = toUnit(
      paymentPolicyId,
      paymentNftTn,
    );

    const paymentData = yield* Effect.promise(
      () => (getPaymentValidatorDatum(paymentUTxO)),
    );

    const interval_amount = paymentData[0].interval_amount *
      config.extension_intervals;
    const newTotalSubscriptionFee = paymentData[0].subscription_fee_qty +
      (interval_amount * config.extension_intervals);
    const newNumIntervals = paymentData[0].num_intervals +
      config.extension_intervals;
    const extension_period = paymentData[0].interval_length *
      config.extension_intervals;

    const newSubscriptionEnd = paymentData[0].subscription_end +
      extension_period;

    const paymentDatum: PaymentDatum = {
      service_nft_tn: paymentData[0].service_nft_tn,
      subscriber_nft_tn: paymentData[0].subscriber_nft_tn,
      subscription_fee: paymentData[0].subscription_fee,
      subscription_fee_qty: newTotalSubscriptionFee,
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

    const subscriberUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(subscriberAddress)
    );

    const tx = yield* lucid
      .newTx()
      .collectFrom(subscriberUTxOs) // subscriber user nft utxo
      .collectFrom([paymentUTxO], extendRedeemer) // subscriber utxos
      .readFrom([serviceUTxO])
      .pay.ToAddress(subscriberAddress, {
        [subscriberNFT]: 1n,
      })
      .pay.ToAddressWithData(paymentValidator.spendValAddress, {
        kind: "inline",
        value: paymentValDatum,
      }, {
        lovelace: newTotalSubscriptionFee,
        [paymentNFT]: 1n,
      })
      .attach.SpendingValidator(paymentValidator.spendValidator)
      .completeProgram();

    return tx;
  });
