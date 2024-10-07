import {
  Address,
  Constr,
  Data,
  LucidEvolution,
  mintingPolicyToId,
  RedeemerBuilder,
  selectUTxOs,
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
  Effect.gen(function* () { // return type ,
    const subscriberAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const validators = getMultiValidator(lucid, config.scripts);

    const paymentPolicyId = mintingPolicyToId(config.minting_Policy);
    console.log("Payment Policy Id: ", paymentPolicyId);

    const subscriberUTxO = yield* Effect.promise(() =>
      lucid.utxosAtWithUnit(
        subscriberAddress,
        config.subscriber_token,
      )
    );

    const paymentValue = config.paymentUTxO[0].assets.lovelace;
    console.log("Payment UTxO Value: ", paymentValue);

    if (!subscriberUTxO || !subscriberUTxO.length) {
      console.error("No UTxO found at user address: " + subscriberAddress);
    }

    const selectedUTxOs = selectUTxOs(config.subscriberUTxO, {
      ["lovelace"]: 5000000n,
    }, false);

    const serviceDatum = lucid.datumOf(config.serviceUTxO[0]);
    console.log("Service Datum: ", serviceDatum);

    const paymentDatum: PaymentDatum = {
      service_nft_tn: config.service_nft_tn,
      account_nft_tn: config.account_nft_tn,
      subscription_fee: config.subscription_fee,
      total_subscription_fee: config.total_subscription_fee,
      subscription_start: config.subscription_start,
      subscription_end: config.subscription_end,
      interval_length: config.interval_length,
      interval_amount: config.interval_amount,
      num_intervals: config.num_intervals,
      last_claimed: config.last_claimed,
      penalty_fee: config.penalty_fee,
      penalty_fee_qty: config.penalty_fee_qty,
      minimum_ada: config.minimum_ada,
    };

    const directPaymentDatum = Data.to<PaymentDatum>(
      paymentDatum,
      PaymentDatum,
    );

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
      inputs: [subscriberUTxO[0], config.paymentUTxO[0]],
    };

    console.log("Merchant UTxO", subscriberUTxO);
    console.log("Payment UTxO", config.paymentUTxO);
    console.log("Selected UTxO", selectedUTxOs);

    const tx = yield* lucid
      .newTx()
      .collectFrom(config.subscriberUTxO) // subscriber user nft utxo
      // .collectFrom(selectedUTxOs) // subscriber user nft utxo
      .collectFrom(config.paymentUTxO, subscriberWithdrawRedeemer) // subscriber utxos
      .readFrom(config.serviceUTxO)
      .pay.ToAddress(subscriberAddress, {
        lovelace: config.paymentUTxO[0].assets.lovelace,
        [config.subscriber_token]: 1n,
      })
      .pay.ToAddressWithData(validators.spendValAddress, {
        kind: "inline",
        value: paymentValDatum,
      }, {
        lovelace: config.total_subscription_fee,
        [config.payment_token]: 1n,
      })
      .validFrom(Number(config.subscription_start))
      .attach.SpendingValidator(validators.spendValidator)
      .completeProgram();

    return tx;
  });
