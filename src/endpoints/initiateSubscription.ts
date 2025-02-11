import {
  Address,
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
import { getMultiValidator } from "../core/index.js";
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
    const subscriptionStartTime = config.current_time + BigInt(6000);
    const subscriberAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const validators = getMultiValidator(lucid, paymentScript);
    const paymentPolicyId = mintingPolicyToId(validators.mintValidator);

    const subscriberUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(subscriberAddress)
    );
    if (!subscriberUTxOs || !subscriberUTxOs.length) {
      console.error("No UTxO found at user address: " + subscriberAddress);
    }

    const subscriberNft = toUnit(
      accountPolicyId,
      config.subscriber_nft_tn,
    );

    const serviceNft = toUnit(
      servicePolicyId,
      config.service_nft_tn,
    );

    const serviceUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        serviceNft,
      )
    );

    const subscriberUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        subscriberNft,
      )
    );

    if (!subscriberUTxO) {
      throw new Error(" subscriberUTxO not found");
    }

    const tokenName = fromText("subscription"); // generateUniqueAssetName(subscriberUTxO, "");
    console.log("paymentNftTn: ", tokenName);

    const paymentNFT = toUnit(
      paymentPolicyId,
      tokenName,
    );

    const initiateSubscriptionRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        // Construct the redeemer using the input indices
        const serviceRefIndex = 0n;
        const subscriberIndex = 0n;
        const paymentIndex = 1n; //BigInt(subscriberUTxO.outputIndex);

        const paymentRedeemer: InitSubscription = {
          service_ref_input_index: serviceRefIndex,
          subscriber_input_index: subscriberIndex,
          payment_output_index: paymentIndex,
        };

        const redeemerData = Data.to(paymentRedeemer, InitSubscription);

        return redeemerData;
      },
      // Specify the inputs relevant to the redeemer
      inputs: [subscriberUTxO],
    };

    // const currentTime = BigInt(Date.now());
    const serviceData = yield* Effect.promise(
      () => (getServiceValidatorDatum(serviceUTxO)),
    );

    const interval_amount = serviceData[0].service_fee;
    const interval_length = serviceData[0].interval_length;
    const subscription_end = subscriptionStartTime +
      interval_length * config.num_intervals;

    const totalSubscriptionQty = interval_amount *
      config.num_intervals;

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
      subscription_start: subscriptionStartTime,
      subscription_end: subscription_end,
      original_subscription_end: subscription_end,
      installments: createInstallments(
        subscriptionStartTime,
        interval_length,
        interval_amount,
        Number(config.num_intervals),
      ),
    };

    const allDatums: PaymentValidatorDatum = {
      Payment: [paymentDatum],
    };

    const paymentValDatum = Data.to<PaymentValidatorDatum>(
      allDatums,
      PaymentValidatorDatum,
    );

    // Find UTxO with sufficient lovelace

    const selectedUTxO = subscriberUTxOs.find((utxo) =>
      utxo.assets.lovelace >= totalSubscriptionQty
    );

    if (!selectedUTxO) {
      throw new Error("No UTxO with sufficient ADA found");
    }
    const subscriberAssets = {
      [subscriberNft]: 1n,
    };

    const tx = yield* lucid
      .newTx()
      .readFrom([serviceUTxO])
      .collectFrom([subscriberUTxO])
      .mintAssets({ [paymentNFT]: 1n }, initiateSubscriptionRedeemer)
      // .pay.ToAddress(subscriberAddress, subscriberAssets)
      .pay.ToAddressWithData(validators.spendValAddress, {
        kind: "inline",
        value: paymentValDatum,
      }, {
        [paymentNFT]: 1n,
        lovelace: totalSubscriptionQty,
      })
      .validFrom(Number(subscriptionStartTime) + 1000)
      .attach.MintingPolicy(validators.mintValidator)
      .completeProgram();

    return tx;
  });
