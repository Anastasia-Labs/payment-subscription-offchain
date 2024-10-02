import {
  Address,
  applyParamsToScript,
  Constr,
  Data,
  fromHex,
  LucidEvolution,
  MintingPolicy,
  mintingPolicyToId,
  selectUTxOs,
  toHex,
  toUnit,
  TransactionError,
  TxSignBuilder,
  validatorToAddress,
} from "@lucid-evolution/lucid";
import { sha3_256 } from "@noble/hashes/sha3";
import {
  ExtendPaymentConfig,
  InitPaymentConfig,
  Result,
} from "../core/types.js";
import {
  InitiatePayment,
  //MintPayment,
  PaymentDatum,
  PaymentValidatorDatum,
  PenaltyDatum,
} from "../core/contract.types.js";
import { getMultiValidator } from "../core/index.js";
import { Effect } from "effect";

export const extendSubscription = (
  lucid: LucidEvolution,
  config: ExtendPaymentConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () { // return type ,
    const subscriberAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const validators = getMultiValidator(lucid, config.scripts);

    const paymentPolicyId = mintingPolicyToId(config.minting_Policy);
    console.log("Payment Policy Id: ", paymentPolicyId);

    const subscriberUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(subscriberAddress)
    );
    if (!subscriberUTxOs || !subscriberUTxOs.length) {
      console.error("No UTxO found at user address: " + subscriberAddress);
    }

    const paymentredeemer: InitiatePayment = {
      InitSubscripton: {
        output_reference: {
          txHash: {
            hash: subscriberUTxOs[0].txHash,
          },
          outputIndex: BigInt(subscriberUTxOs[0].outputIndex),
        },
        input_index: 0n,
      },
    };

    const redeemerData = Data.to(paymentredeemer, InitiatePayment);
    console.log("Redeemer", redeemerData);

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

    const penaltyDatum: PenaltyDatum = {
      service_nft_tn: config.service_nft_tn,
      account_nft_tn: config.account_nft_tn,
      penalty_fee: config.penalty_fee,
      penalty_fee_qty: config.penalty_fee_qty,
    };

    // const directPenaltyDatum = Data.to<PenaltyDatum>(
    //   penaltyDatum,
    //   PenaltyDatum,
    // );

    // const directDatum = Data.to<PaymentDatum>(
    //   paymentDatum,
    //   PaymentDatum,
    // );

    const allDatums: PaymentValidatorDatum = {
      Payment: [paymentDatum],
    };

    const paymentValDatum = Data.to<PaymentValidatorDatum>(
      allDatums,
      PaymentValidatorDatum,
    );

    // const directDatum = Data.to(new Constr(0, [paymentValDatum]));
    // console.log("EXTEND ALL DATUM", paymentValDatum);
    console.log("EXTEND PAYMENT DATUM", paymentDatum);
    console.log("EXTEND DIRECT DATUM", directPaymentDatum);
    // console.log("EXTEND PENALTY DATUM", penaltyDatum);

    console.log("Account UTxOs :: ", config.accountUtxo);
    console.log("Service UTxOs :: ", config.serviceUtxo);

    console.log("Payment Utxo", config.paymentUtxo);
    console.log("Subscriber UTxO", config.accountUtxo);
    console.log("User  Token", config.user_token);
    // console.log("PAyment  Token", config.ref_token);
    const wrappedRedeemer = Data.to(new Constr(1, [new Constr(0, [])]));

    const tx = yield* lucid
      .newTx()
      .readFrom(config.serviceUtxo)
      .collectFrom(config.accountUtxo) // subscriber user nft utxo
      .collectFrom(config.paymentUtxo, wrappedRedeemer) // subscriber utxos
      .pay.ToAddress(subscriberAddress, {
        [config.user_token]: 1n,
      })
      .pay.ToAddressWithData(validators.spendValAddress, {
        kind: "inline",
        value: paymentValDatum,
      }, {
        lovelace: config.total_subscription_fee,
        [config.payment_token]: 1n,
      })
      .attach.SpendingValidator(validators.spendValidator)
      .completeProgram();

    return tx;
  });
