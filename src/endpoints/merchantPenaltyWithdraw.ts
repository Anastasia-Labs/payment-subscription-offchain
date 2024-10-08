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
import { WithdrawPenaltyConfig } from "../core/types.js";
import { PaymentValidatorDatum, PenaltyDatum } from "../core/contract.types.js";
import { getMultiValidator } from "../core/index.js";
import { Effect } from "effect";

export const merchantPenaltyWithdraw = (
  lucid: LucidEvolution,
  config: WithdrawPenaltyConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () { // return type ,
    const merchantAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const validators = getMultiValidator(lucid, config.scripts);

    const paymentPolicyId = mintingPolicyToId(validators.mintValidator);
    console.log("Payment Policy Id: ", paymentPolicyId);

    const merchantUTxOs = yield* Effect.promise(() =>
      lucid.utxosAtWithUnit(
        merchantAddress,
        config.merchant_token,
      )
    );

    if (!merchantUTxOs || !merchantUTxOs.length) {
      console.error("No UTxO found at user address: " + merchantAddress);
    }

    const selectedUTxOs = selectUTxOs(config.merchantUTxO, {
      ["lovelace"]: 5000000n,
    }, false);

    const merchantUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        config.merchant_token,
      )
    );

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
      inputs: [merchantUTxOs[0], config.paymentUTxO[0]],
    };

    const terminateSubscriptionRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        // Construct the redeemer using the input indices
        const merchantIndex = inputIndices[0];
        const paymentIndex = inputIndices[1];

        return Data.to(
          new Constr(1, [BigInt(merchantIndex), BigInt(paymentIndex)]),
        );
      },
      // Specify the inputs relevant to the redeemer
      inputs: [merchantUTxO, config.paymentUTxO[0]],
    };

    console.log("Merchant UTxO", merchantUTxOs);
    console.log("Payment UTxO", config.paymentUTxO);
    console.log("Selected UTxO", selectedUTxOs);
    // console.log("Spend UTxO", spendInputs);
    // console.log("Service PolicyId", config.service_policyId);
    console.log("Service NFT TN", config.service_nft_tn);
    console.log("Merchant NFT", config.merchant_token);
    const terminateRedeemer = Data.to(new Constr(1, [])); // Assuming DeleteAccount is index 1 in your MintAccount enum

    const tx = yield* lucid
      .newTx()
      .collectFrom([merchantUTxO])
      // .collectFrom(selectedUTxOs) // subscriber user nft utxo
      .collectFrom(config.paymentUTxO, merchantWithdrawRedeemer) // subscriber utxos
      .readFrom(config.serviceUTxO)
      .mintAssets(
        { [config.payment_token]: -1n },
        terminateSubscriptionRedeemer,
      )
      .pay.ToAddress(merchantAddress, {
        lovelace: config.penalty_fee_qty,
        [config.merchant_token]: 1n,
      })
      .attach.MintingPolicy(validators.mintValidator)
      .attach.SpendingValidator(validators.spendValidator)
      .completeProgram();

    return tx;
  });
