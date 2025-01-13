import {
  Address,
  Data,
  LucidEvolution,
  mintingPolicyToId,
  RedeemerBuilder,
  toUnit,
  TransactionError,
  TxSignBuilder,
} from "@lucid-evolution/lucid";
import { InitPaymentConfig } from "../core/types.js";
import {
  InitiatePayment,
  PaymentDatum,
  PaymentValidatorDatum,
} from "../core/contract.types.js";
import { generateUniqueAssetName } from "../core/utils/assets.js";
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

    const tokenName = generateUniqueAssetName(subscriberUTxO, "");
    console.log("payment tokenName " + tokenName);

    const paymentNFT = toUnit(
      paymentPolicyId,
      tokenName,
    );

    const initiateSubscriptionRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        // Construct the redeemer using the input indices
        const subscriberIndex = inputIndices[0];

        const paymentRedeemer: InitiatePayment = {
          output_reference: {
            txHash: {
              hash: subscriberUTxO.txHash,
            },
            outputIndex: BigInt(subscriberUTxO.outputIndex),
          },
          input_index: subscriberIndex,
        };

        const redeemerData = Data.to(paymentRedeemer, InitiatePayment);

        return redeemerData;
      },
      // Specify the inputs relevant to the redeemer
      inputs: [subscriberUTxO],
    };

    const currentTime = BigInt(Date.now());
    const serviceData = yield* Effect.promise(
      () => (getServiceValidatorDatum(serviceUTxO)),
    );

    const interval_amount = serviceData[0].service_fee_qty;
    const interval_length = serviceData[0].interval_length;
    // const subscription_fee_qty = serviceData[0].num_intervals * interval_amount;
    const subscription_end = currentTime +
      interval_length * config.num_intervals;

    // const initial_subscription_fee = interval_amount * num_intervals;
    const total_subscription_fee = interval_amount *
      config.num_intervals;
    console.log("interval_length: ", interval_length);

    const paymentDatum: PaymentDatum = {
      service_nft_tn: config.service_nft_tn,
      subscriber_nft_tn: config.subscriber_nft_tn,
      subscription_fee: serviceData[0].service_fee,
      total_subscription_fee: total_subscription_fee,
      subscription_start: currentTime + BigInt(1000 * 60),
      subscription_end: subscription_end + BigInt(1000 * 60),
      interval_length: interval_length,
      interval_amount: interval_amount,
      num_intervals: config.num_intervals,
      last_claimed: 0n,
      penalty_fee: serviceData[0].penalty_fee,
      penalty_fee_qty: serviceData[0].penalty_fee_qty,
      minimum_ada: serviceData[0].minimum_ada,
    };

    const allDatums: PaymentValidatorDatum = {
      Payment: [paymentDatum],
    };

    const paymentValDatum = Data.to<PaymentValidatorDatum>(
      allDatums,
      PaymentValidatorDatum,
    );

    console.log("accountAssets: begin");
    const accountAssets = subscriberUTxO.assets;

    console.log("accountAssets: ", accountAssets);

    const tx = yield* lucid
      .newTx()
      .readFrom([serviceUTxO])
      .collectFrom(subscriberUTxOs)
      .mintAssets({ [paymentNFT]: 1n }, initiateSubscriptionRedeemer)
      .pay.ToAddress(subscriberAddress, accountAssets)
      .pay.ToAddressWithData(validators.spendValAddress, {
        kind: "inline",
        value: paymentValDatum,
      }, {
        lovelace: total_subscription_fee,
        [paymentNFT]: 1n,
      })
      .attach.MintingPolicy(validators.mintValidator)
      .completeProgram();

    return tx;
  });
