import {
  Address,
  Constr,
  Data,
  LucidEvolution,
  RedeemerBuilder,
  toUnit,
  TransactionError,
  TxBuilderError,
  TxSignBuilder,
  UTxO,
} from "@lucid-evolution/lucid";
import { WithdrawPenaltyConfig } from "../core/types.js";
import { getMultiValidator, PaymentValidatorDatum } from "../core/index.js";
import { Effect } from "effect";
import { getPenaltyDatum } from "./utils.js";
import { tokenNameFromUTxO } from "../core/utils/assets.js";
import {
  paymentPolicyId,
  paymentScript,
  servicePolicyId,
} from "../core/validators/constants.js";

export const merchantPenaltyWithdrawProgram = (
  lucid: LucidEvolution,
  config: WithdrawPenaltyConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () {
    const merchantAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const validators = getMultiValidator(lucid, paymentScript);

    const paymentAddress = validators.spendValAddress;

    const paymentUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(paymentAddress)
    );

    const penaltyUTxOs = paymentUTxOs.filter((utxo: UTxO) => {
      if (!utxo.datum) return false;

      try {
        const validatorDatum = Data.from<PaymentValidatorDatum>(
          utxo.datum,
          PaymentValidatorDatum,
        );

        // Check the structure of the datum
        if (validatorDatum && typeof validatorDatum === "object") {
          // Check if it's a Penalty variant
          if (
            "Penalty" in validatorDatum && Array.isArray(validatorDatum.Penalty)
          ) {
            const datum = validatorDatum.Penalty[0];
            return datum.penalty_fee_qty > 0;
          }
        }
        return false;
      } catch (error) {
        console.error("Error parsing datum:", error);
        return false;
      }
    });

    const payment_token_name = tokenNameFromUTxO(
      penaltyUTxOs,
      paymentPolicyId,
    );

    const paymentNFT = toUnit(
      paymentPolicyId,
      payment_token_name,
    );

    const penaltyData = yield* Effect.promise(
      () => (getPenaltyDatum(penaltyUTxOs)),
    );

    const serviceRefNft = toUnit(
      servicePolicyId,
      config.service_nft_tn,
    );

    const merchantNft = toUnit(
      servicePolicyId,
      config.merchant_nft_tn,
    );

    const merchantUTxOs = yield* Effect.promise(() =>
      lucid.utxosAtWithUnit(
        merchantAddress,
        merchantNft,
      )
    );

    if (!config.merchant_utxos || !config.merchant_utxos.length) {
      yield* Effect.fail(
        new TxBuilderError({
          cause: "No UTxO found at user address: " + merchantAddress,
        }),
      );
    }

    const merchantUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        merchantNft,
      )
    );

    const penaltyUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        paymentNFT,
      )
    );

    const serviceUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        serviceRefNft,
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
            new Constr(1, [BigInt(merchantIndex), BigInt(paymentIndex)]),
          ]),
        );
      },
      // Specify the inputs relevant to the redeemer
      inputs: [merchantUTxO, penaltyUTxO],
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
      inputs: [merchantUTxO, penaltyUTxO],
    };

    const tx = yield* lucid
      .newTx()
      .collectFrom(merchantUTxOs)
      .collectFrom([penaltyUTxO], merchantWithdrawRedeemer) // subscriber utxos
      .readFrom([serviceUTxO])
      .mintAssets(
        { [paymentNFT]: -1n },
        terminateSubscriptionRedeemer,
      )
      .pay.ToAddress(merchantAddress, {
        lovelace: penaltyData[0].penalty_fee_qty,
        [merchantNft]: 1n,
      })
      .attach.MintingPolicy(validators.mintValidator)
      .attach.SpendingValidator(validators.spendValidator)
      .completeProgram();

    return tx;
  });
