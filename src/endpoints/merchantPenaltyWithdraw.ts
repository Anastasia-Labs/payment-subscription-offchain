import {
  Address,
  Constr,
  Data,
  LucidEvolution,
  RedeemerBuilder,
  toUnit,
  TransactionError,
  TxSignBuilder,
} from "@lucid-evolution/lucid";
import { WithdrawPenaltyConfig } from "../core/types.js";
import { getMultiValidator } from "../core/index.js";
import { Effect } from "effect";
import { findPenaltyDetails, getPenaltyDatum } from "./utils.js";
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

    const merchantUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(merchantAddress)
    );

    const { paymentNftTn, penaltyDatum } = yield* Effect.promise(() =>
      findPenaltyDetails(paymentUTxOs, config.service_nft_tn, paymentPolicyId)
    );

    const paymentNFT = toUnit(
      paymentPolicyId,
      paymentNftTn,
    );

    const penaltyUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        paymentNFT,
      )
    );

    // const penaltyData = yield* Effect.promise(
    //   () => (getPenaltyDatum(penaltyUTxO)),
    // );

    const serviceRefNft = toUnit(
      servicePolicyId,
      config.service_nft_tn,
    );

    const serviceUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        serviceRefNft,
      )
    );

    const merchantNft = toUnit(
      servicePolicyId,
      config.merchant_nft_tn,
    );

    const merchantUTxO = yield* Effect.promise(() =>
      lucid.utxoByUnit(
        merchantNft,
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
        lovelace: penaltyDatum.penalty_fee_qty,
        [merchantNft]: 1n,
      })
      .attach.MintingPolicy(validators.mintValidator)
      .attach.SpendingValidator(validators.spendValidator)
      .completeProgram();

    return tx;
  });
