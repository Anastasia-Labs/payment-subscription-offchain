import {
  Address,
  Constr,
  Data,
  LucidEvolution,
  RedeemerBuilder,
  TransactionError,
  TxSignBuilder,
} from "@lucid-evolution/lucid";
import { SubscriberWithdrawConfig } from "../core/types.js";
import { PaymentDatum, PaymentValidatorDatum } from "../core/contract.types.js";
import { getMultiValidator } from "../core/index.js";
import { Effect } from "effect";

export const subscriberWithdraw = (
  lucid: LucidEvolution,
  config: SubscriberWithdrawConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () {
    const subscriberAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const validators = getMultiValidator(lucid, config.scripts);

    const subscriberUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        config.subscriber_token,
      )
    );

    const subscriberUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(
        subscriberAddress,
      )
    );
    // const serviceUTxOs = yield* Effect.promise(() =>
    //   lucid.utxosAt(validators.spendValAddress)
    // );

    if (!config.paymentUTxOs.length) {
      throw new Error("No payment UTxOs found");
    }

    // const paymentUTxO = yield* Effect.promise(() =>
    //   lucid.utxoByUnit(
    //     config.payment_token,
    //   )
    // );

    // const serviceUTxO = yield* Effect.promise(() =>
    //   lucid.utxoByUnit(
    //     config.service_ref_token,
    //   )
    // );

    const paymentValue = config.paymentUTxOs[0].assets.lovelace;

    const paymentDatum: PaymentDatum = {
      service_nft_tn: config.paymentDatum.service_nft_tn,
      account_nft_tn: config.paymentDatum.account_nft_tn,
      subscription_fee: config.paymentDatum.subscription_fee,
      total_subscription_fee: config.paymentDatum.total_subscription_fee,
      subscription_start: config.paymentDatum.subscription_start,
      subscription_end: config.paymentDatum.subscription_end,
      interval_length: config.paymentDatum.interval_length,
      interval_amount: config.paymentDatum.interval_amount,
      num_intervals: config.paymentDatum.num_intervals,
      last_claimed: config.paymentDatum.last_claimed,
      penalty_fee: config.paymentDatum.penalty_fee,
      penalty_fee_qty: config.paymentDatum.penalty_fee_qty,
      minimum_ada: config.paymentDatum.minimum_ada,
    };

    const allDatums: PaymentValidatorDatum = {
      Payment: [paymentDatum],
    };

    const paymentValDatum = Data.to<PaymentValidatorDatum>(
      allDatums,
      PaymentValidatorDatum,
    );

    const subscriberWithdrawRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        // Construct the redeemer using the input indices
        const subscriberIndex = inputIndices[0];
        const paymentIndex = inputIndices[1];

        return Data.to(
          new Constr(1, [
            new Constr(3, [BigInt(subscriberIndex), BigInt(paymentIndex)]),
          ]),
        );
      },
      // Specify the inputs relevant to the redeemer
      inputs: [subscriberUTxO, config.paymentUTxOs[0]],
    };

    const tx = yield* lucid
      .newTx()
      .collectFrom(subscriberUTxOs) // subscriber user nft utxo
      .readFrom(config.serviceUTxOs)
      .collectFrom(config.paymentUTxOs, subscriberWithdrawRedeemer) // subscriber utxos
      .pay.ToAddress(subscriberAddress, {
        lovelace: paymentValue,
        [config.subscriber_token]: 1n,
      })
      .pay.ToAddressWithData(validators.spendValAddress, {
        kind: "inline",
        value: paymentValDatum,
      }, {
        [config.payment_token]: 1n,
      })
      .attach.SpendingValidator(validators.spendValidator)
      .completeProgram();

    return tx;
  });
