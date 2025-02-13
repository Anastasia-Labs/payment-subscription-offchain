import {
  Address,
  Assets,
  Constr,
  Data,
  LucidEvolution,
  RedeemerBuilder,
  toUnit,
  TransactionError,
  TxSignBuilder,
  UTxO,
} from "@lucid-evolution/lucid";
import { SubscriberWithdrawConfig } from "../core/types.js";
import { PaymentDatum, PaymentValidatorDatum } from "../core/contract.types.js";
import { getMultiValidator } from "../core/index.js";
import { Effect } from "effect";
import { getPaymentValidatorDatum } from "./utils.js";
import { tokenNameFromUTxO } from "../core/utils/assets.js";
import {
  accountPolicyId,
  paymentPolicyId,
  paymentScript,
} from "../core/validators/constants.js";

export const subscriberWithdrawProgram = (
  lucid: LucidEvolution,
  config: SubscriberWithdrawConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () {
    const validators = getMultiValidator(lucid, paymentScript);

    const subscriberAddress: Address = yield* Effect.promise(() => lucid.wallet().address());

    const paymentAddress = validators.spendValAddress;
    const paymentUTxOs = yield* Effect.promise(() => lucid.utxosAt(paymentAddress));

    const payment_token_name = tokenNameFromUTxO(paymentUTxOs, paymentPolicyId);
    const paymentNft = toUnit(paymentPolicyId, payment_token_name);

    const subscriberNft = toUnit(accountPolicyId, config.subscriber_nft_tn);

    const subscriberUTxO = yield* Effect.promise(() => lucid.utxoByUnit(subscriberNft));

    const subscriberUTxOs = yield* Effect.promise(() => lucid.utxosAt(subscriberAddress));

    if (!paymentUTxOs.length) {
      throw new Error("No payment UTxOs found");
    }

    const inActivePaymentUTxOs = paymentUTxOs.filter((utxo: UTxO) => {
      if (!utxo.datum) return false;

      const validatorDatum = Data.from<PaymentValidatorDatum>(utxo.datum, PaymentValidatorDatum);

      let datum: PaymentDatum;
      if ("Payment" in validatorDatum) {
        datum = validatorDatum.Payment[0];
      } else {
        throw new Error("Expected Payment variant");
      }

      return datum.service_nft_tn === config.service_nft_tn;
    });

    const paymentUTxO = inActivePaymentUTxOs[0]
    const paymentValue = paymentUTxO.assets.lovelace;

    const subscriberWithdrawRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        return Data.to(new Constr(3, [0n, inputIndices[0], inputIndices[1]]));
      },
      inputs: [subscriberUTxO, paymentUTxO],
    };

    const mintingAssets: Assets = {
      [paymentNft]: -1n
    };
    const mintingRedeemer = Data.to(new Constr(1, []))

    const tx = yield* lucid
      .newTx()
      .collectFrom(subscriberUTxOs)
      .collectFrom([paymentUTxO], subscriberWithdrawRedeemer)
      .readFrom(config.service_utxos)
      .pay.ToAddress(subscriberAddress, {
        lovelace: paymentValue,
        [subscriberNft]: 1n,
      })
      .mintAssets(mintingAssets, mintingRedeemer)
      .attach.SpendingValidator(validators.spendValidator)
      .attach.MintingPolicy(validators.mintValidator)
      .completeProgram();

    return tx;
  });
