import {
  Address,
  Constr,
  Data,
  LucidEvolution,
  RedeemerBuilder,
  TransactionError,
  TxSignBuilder,
} from "@lucid-evolution/lucid";
import { CreatePenaltyConfig } from "../core/types.js";
import { PaymentValidatorDatum, PenaltyDatum } from "../core/contract.types.js";
import { getMultiValidator } from "../core/index.js";
import { Effect } from "effect";

export const subscriberWithdraw = (
  lucid: LucidEvolution,
  config: CreatePenaltyConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () {
    const subscriberAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const validators = getMultiValidator(lucid, config.scripts);

    const subscriberUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        config.subscriber_token,
      )
    );

    const paymentUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        config.payment_token,
      )
    );

    const paymentValue = paymentUTxO.assets.lovelace;

    const penaltyDatum: PenaltyDatum = {
      service_nft_tn: config.service_nft_tn,
      account_nft_tn: config.account_nft_tn,
      penalty_fee: config.penalty_fee,
      penalty_fee_qty: config.penalty_fee_qty,
    };

    const allDatums: PaymentValidatorDatum = {
      Penalty: [penaltyDatum],
    };

    const penaltyValDatum = Data.to<PaymentValidatorDatum>(
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
      inputs: [subscriberUTxO, paymentUTxO],
    };

    const tx = yield* lucid
      .newTx()
      .collectFrom(config.subscriberUTxO) // subscriber user nft utxo
      .collectFrom(config.paymentUTxO, subscriberWithdrawRedeemer) // subscriber utxos
      .readFrom(config.serviceUTxO)
      .pay.ToAddress(subscriberAddress, {
        lovelace: paymentValue,
        [config.subscriber_token]: 1n,
      })
      .pay.ToAddressWithData(validators.spendValAddress, {
        kind: "inline",
        value: penaltyValDatum,
      }, {
        lovelace: config.penalty_fee_qty,
        [config.payment_token]: 1n,
      })
      .attach.SpendingValidator(validators.spendValidator)
      .completeProgram();

    return tx;
  });
