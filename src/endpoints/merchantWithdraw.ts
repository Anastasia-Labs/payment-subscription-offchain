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
  UTxO,
  utxoToCore,
} from "@lucid-evolution/lucid";
import { MerchantWithdrawConfig } from "../core/types.js";
import {
  InitiatePayment,
  MerchantWithdraw,
  PaymentDatum,
  PaymentValidatorDatum,
} from "../core/contract.types.js";
import { getMultiValidator } from "../core/index.js";
import { Effect } from "effect";
import { u32 } from "@noble/hashes/utils";

export const merchantWithdraw = (
  lucid: LucidEvolution,
  config: MerchantWithdrawConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () { // return type ,
    const merchantAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const validators = getMultiValidator(lucid, config.scripts);

    const paymentPolicyId = mintingPolicyToId(config.minting_Policy);
    console.log("Payment Policy Id: ", paymentPolicyId);

    const merchantUTxO = yield* Effect.promise(() =>
      lucid.utxosAtWithUnit(
        merchantAddress,
        config.merchant_token,
      )
    );

    if (!merchantUTxO || !merchantUTxO.length) {
      console.error("No UTxO found at user address: " + merchantAddress);
    }

    const selectedUTxOs = selectUTxOs(config.merchantUTxO, {
      ["lovelace"]: 5000000n,
    }, false);

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

    const inputs = [...config.merchantUTxO, ...config.paymentUTxO];

    // const compareFn = (a: UTxO, b: UTxO) => {
    //   const c1 = a.txHash.localeCompare(b.txHash);
    //   if (c1 !== 0) {
    //     return c1;
    //   }
    //   return a.outputIndex - b.outputIndex;
    // };

    // const ordered = inputs.sort(compareFn);

    // const indexMap = new Map();

    // ordered.forEach((utxo, index) => {
    //   const key = `${utxo.txHash}:${utxo.outputIndex}`;
    //   indexMap.set(key, BigInt(index)); // Use BigInt if necessary
    // });

    // // helper function to get the index of a specific UTxO:
    // const getIndex = (utxo: UTxO) => {
    //   const key = `${utxo.txHash}:${utxo.outputIndex}`;
    //   return indexMap.get(key);
    // };

    // const merchantIndex = getIndex(merchantUTxO[0]);
    // const paymentIndex = getIndex(config.paymentUTxO[0]);

    const merchantWithdrawRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        // Construct the redeemer using the input indices
        const merchantIndex = inputIndices[0];
        const paymentIndex = inputIndices[1];

        return Data.to(
          new Constr(1, [
            new Constr(2, [BigInt(merchantIndex), BigInt(paymentIndex)]),
          ]),
        );
      },
      // Specify the inputs relevant to the redeemer
      inputs: [merchantUTxO[0], config.paymentUTxO[0]],
    };

    // const wrappedRedeemer = Data.to(
    //   new Constr(1, [
    //     new Constr(2, [BigInt(merchantIndex), BigInt(paymentIndex)]),
    //   ]),
    // );

    console.log("Merchant UTxO", merchantUTxO);
    console.log("Payment UTxO", config.paymentUTxO);
    console.log("Selected UTxO", selectedUTxOs);
    // console.log("Spend UTxO", spendInputs);
    // console.log("Service PolicyId", config.service_policyId);
    // console.log("Service NFT TN", config.service_nft_tn);
    // console.log("Merchant NFT", config.merchant_token);

    const tx = yield* lucid
      .newTx()
      .collectFrom(config.merchantUTxO) // subscriber user nft utxo
      // .collectFrom(selectedUTxOs) // subscriber user nft utxo
      .collectFrom(config.paymentUTxO, merchantWithdrawRedeemer) // subscriber utxos
      .readFrom(config.serviceUTxO)
      .pay.ToAddress(merchantAddress, {
        lovelace: 2_000_000n,
        [config.merchant_token]: 1n,
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
