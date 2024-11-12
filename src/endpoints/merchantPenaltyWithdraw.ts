import {
  Address,
  Constr,
  Data,
  LucidEvolution,
  RedeemerBuilder,
  TransactionError,
  TxBuilderError,
  TxSignBuilder,
} from "@lucid-evolution/lucid";
import { WithdrawPenaltyConfig } from "../core/types.js";
import { getMultiValidator } from "../core/index.js";
import { Effect } from "effect";

export const merchantPenaltyWithdraw = (
  lucid: LucidEvolution,
  config: WithdrawPenaltyConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () {
    const merchantAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const validators = getMultiValidator(lucid, config.scripts);

    const merchantUTxOs = yield* Effect.promise(() =>
      lucid.utxosAtWithUnit(
        merchantAddress,
        config.merchant_token,
      )
    );

    if (!config.merchantUTxOs || !config.merchantUTxOs.length) {
      yield* Effect.fail(
        new TxBuilderError({
          cause: "No UTxO found at user address: " + merchantAddress,
        }),
      );
    }

    const merchantUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        config.merchant_token,
      )
    );

    const paymentUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        config.payment_token,
      )
    );

    const serviceUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        config.service_ref_token,
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
      inputs: [merchantUTxO, paymentUTxO],
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
      inputs: [merchantUTxO, paymentUTxO],
    };

    const tx = yield* lucid
      .newTx()
      .collectFrom(merchantUTxOs)
      .collectFrom([paymentUTxO], merchantWithdrawRedeemer) // subscriber utxos
      .readFrom([serviceUTxO])
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
