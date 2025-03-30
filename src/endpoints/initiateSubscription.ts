import {
  Data,
  fromText,
  LucidEvolution,
  mintingPolicyToId,
  RedeemerBuilder,
  toUnit,
  TransactionError,
  TxSignBuilder,
} from "@lucid-evolution/lucid";
import { InitPaymentConfig } from "../core/types.js";
import {
  InitSubscription,
  Installment,
  PaymentDatum,
  PaymentValidatorDatum,
} from "../core/contract.types.js";
import { getMultiValidator, PAYMENT_TOKEN_NAME } from "../core/index.js";
import { Effect } from "effect";
import {
  accountPolicyId,
  paymentScript,
  servicePolicyId,
} from "../core/validators/constants.js";
import { getServiceValidatorDatum } from "./utils.js";

export const initSubscriptionProgram = (
  lucid: LucidEvolution,
  config: InitPaymentConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () {
    const validators = getMultiValidator(lucid, paymentScript);
    const paymentPolicyId = mintingPolicyToId(validators.mintValidator);

    const subscriberNft = toUnit(accountPolicyId, config.subscriber_nft_tn);
    const serviceNft = toUnit(servicePolicyId, config.service_nft_tn);

    const serviceUTxO = yield* Effect.promise(() => lucid.utxoByUnit(serviceNft));
    const subscriberUTxO = yield* Effect.promise(() => lucid.utxoByUnit(subscriberNft));
    if (!subscriberUTxO) {
      throw new Error(" subscriberUTxO not found");
    }

    const paymentNFT = toUnit(paymentPolicyId, fromText(PAYMENT_TOKEN_NAME));

    const initiateSubscriptionRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        const paymentRedeemer: InitSubscription = {
          service_ref_input_index: 0n,
          subscriber_input_index: inputIndices[0],
          payment_output_index: 0n,
        };

        const redeemerData = Data.to(paymentRedeemer, InitSubscription);
        return redeemerData;
      },
      inputs: [subscriberUTxO],
    };

    const serviceData = getServiceValidatorDatum(serviceUTxO);
    if (!serviceData || !serviceData.length) {
      throw new Error("Service not found");
    }
    const serviceDatum = serviceData[0];

    const interval_amount = serviceDatum.service_fee;
    const interval_length = serviceDatum.interval_length;
    const subscription_end = config.subscription_start + interval_length * serviceDatum.num_intervals;
    const totalSubscriptionQty = interval_amount * serviceDatum.num_intervals;

    const createInstallments = (
      startTime: bigint,
      intervalLength: bigint,
      intervalAmount: bigint,
      numIntervals: number,
    ): Installment[] => {
      return Array.from(
        { length: numIntervals },
        (_, i) =>
          ({
            claimable_at: startTime + (intervalLength * BigInt(i + 1)),
            claimable_amount: intervalAmount,
          }) as Installment,
      );
    };

    const paymentDatum: PaymentDatum = {
      service_nft_tn: config.service_nft_tn,
      subscriber_nft_tn: config.subscriber_nft_tn,
      subscription_start: config.subscription_start,
      subscription_end: subscription_end,
      original_subscription_end: subscription_end,
      installments: createInstallments(
        config.subscription_start,
        interval_length,
        interval_amount,
        Number(serviceDatum.num_intervals),
      ),
    };

    const allDatums: PaymentValidatorDatum = {
      Payment: [paymentDatum],
    };

    const paymentValDatum = Data.to<PaymentValidatorDatum>(
      allDatums,
      PaymentValidatorDatum,
    );

    console.log("config.subscription_start: ", config.subscription_start);

    const tx = yield* lucid
      .newTx()
      .readFrom([serviceUTxO])
      .collectFrom([subscriberUTxO])
      .mintAssets({ [paymentNFT]: 1n }, initiateSubscriptionRedeemer)
      .pay.ToAddressWithData(validators.spendValAddress, {
        kind: "inline",
        value: paymentValDatum,
      }, {
        [paymentNFT]: 1n,
        lovelace: totalSubscriptionQty,
      })
      .validTo(Number(config.subscription_start) - 1_000)
      .attach.MintingPolicy(validators.mintValidator)
      .completeProgram();

    return tx;
  });
