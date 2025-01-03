import {
  Address,
  Constr,
  Data,
  LucidEvolution,
  RedeemerBuilder,
  toUnit,
  TransactionError,
  TxSignBuilder,
  UTxO,
} from "@lucid-evolution/lucid";
import { SubscriberWithdrawConfig } from "../core/types.js";
import { PaymentDatum, PaymentValidatorDatum } from "../core/contract.types.js";
import { getMultiValidator } from "../core/index.js";
import { Effect } from "effect";
import { getPaymentValidatorDatum } from "./utils.js";
import { tokenNameFromUTxO } from "../core/utils/assets.js";
import {
  accountPolicyId,
  paymentPolicyId,
  paymentScript,
} from "../core/validators/constants.js";

export const subscriberWithdrawProgram = (
  lucid: LucidEvolution,
  config: SubscriberWithdrawConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () {
    const subscriberAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const validators = getMultiValidator(lucid, paymentScript);

    const paymentAddress = validators.spendValAddress;

    const paymentUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(paymentAddress)
    );

    const payment_token_name = tokenNameFromUTxO(
      paymentUTxOs,
      paymentPolicyId,
    );

    const paymentNFT = toUnit(
      paymentPolicyId,
      payment_token_name,
    );

    const subscriberNft = toUnit(
      accountPolicyId,
      config.subscriber_nft_tn,
    );

    const subscriberUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        subscriberNft,
      )
    );

    const subscriberUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(
        subscriberAddress,
      )
    );

    if (!paymentUTxOs.length) {
      throw new Error("No payment UTxOs found");
    }

    const inActivePaymentUTxOs = paymentUTxOs.filter((utxo: UTxO) => {
      if (!utxo.datum) return false;

      const validatorDatum = Data.from<PaymentValidatorDatum>(
        utxo.datum,
        PaymentValidatorDatum,
      );

      let datum: PaymentDatum;
      if ("Payment" in validatorDatum) {
        datum = validatorDatum.Payment[0];
      } else {
        throw new Error("Expected Payment variant");
      }

      return datum.service_nft_tn === config.service_nft_tn;
    });

    const paymentData = yield* Effect.promise(
      () => (getPaymentValidatorDatum(paymentUTxOs)),
    );

    const paymentValue = inActivePaymentUTxOs[0].assets.lovelace;

    const paymentDatum: PaymentDatum = {
      service_nft_tn: paymentData[0].service_nft_tn,
      account_nft_tn: paymentData[0].account_nft_tn,
      subscription_fee: paymentData[0].subscription_fee,
      total_subscription_fee: paymentData[0].total_subscription_fee,
      subscription_start: paymentData[0].subscription_start,
      subscription_end: paymentData[0].subscription_end,
      interval_length: paymentData[0].interval_length,
      interval_amount: paymentData[0].interval_amount,
      num_intervals: paymentData[0].num_intervals,
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
      inputs: [subscriberUTxO, inActivePaymentUTxOs[0]],
    };

    const tx = yield* lucid
      .newTx()
      .collectFrom(subscriberUTxOs) // subscriber user nft utxo
      .readFrom(config.service_utxos)
      .collectFrom(paymentUTxOs, subscriberWithdrawRedeemer)
      .pay.ToAddress(subscriberAddress, {
        lovelace: paymentValue,
        [subscriberNft]: 1n,
      })
      .pay.ToAddressWithData(validators.spendValAddress, {
        kind: "inline",
        value: paymentValDatum,
      }, {
        [paymentNFT]: 1n,
      })
      .attach.SpendingValidator(validators.spendValidator)
      .completeProgram();

    return tx;
  });
