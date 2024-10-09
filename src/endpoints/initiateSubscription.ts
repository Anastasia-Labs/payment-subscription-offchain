import {
  Address,
  Data,
  LucidEvolution,
  mintingPolicyToId,
  selectUTxOs,
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

export const initiateSubscription = (
  lucid: LucidEvolution,
  config: InitPaymentConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () {
    const subscriberAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const validators = getMultiValidator(lucid, config.scripts);

    const paymentPolicyId = mintingPolicyToId(validators.mintValidator);

    const subscriberUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(subscriberAddress)
    );
    if (!subscriberUTxOs || !subscriberUTxOs.length) {
      console.error("No UTxO found at user address: " + subscriberAddress);
    }

    // Selecting a utxo containing atleast 2 ADA to cover tx fees and min ADA
    // Note: To avoid tx balancing errors, the utxo should only contain lovelaces
    // Can make into optional function
    const selectedUTxOs = selectUTxOs(subscriberUTxOs, {
      ["lovelace"]: 2000000n,
    });
    const tokenName = generateUniqueAssetName(selectedUTxOs[0], "");

    const paymentRedeemer: InitiatePayment = {
      output_reference: {
        txHash: {
          hash: subscriberUTxOs[0].txHash,
        },
        outputIndex: BigInt(subscriberUTxOs[0].outputIndex),
      },
      input_index: 0n,
    };

    const redeemerData = Data.to(paymentRedeemer, InitiatePayment);

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

    const allDatums: PaymentValidatorDatum = {
      Payment: [paymentDatum],
    };

    const paymentValDatum = Data.to<PaymentValidatorDatum>(
      allDatums,
      PaymentValidatorDatum,
    );

    const accountAssets = config.subscriberUTxO[0].assets;

    const paymentNFT = toUnit(
      paymentPolicyId,
      tokenName,
    );

    const tx = yield* lucid
      .newTx()
      .readFrom(config.serviceUTxO)
      .collectFrom(config.subscriberUTxO)
      .mintAssets({ [paymentNFT]: 1n }, redeemerData)
      .pay.ToAddress(subscriberAddress, accountAssets)
      .pay.ToAddressWithData(validators.spendValAddress, {
        kind: "inline",
        value: paymentValDatum,
      }, {
        lovelace: config.total_subscription_fee,
        [paymentNFT]: 1n,
      })
      .attach.MintingPolicy(validators.mintValidator)
      .completeProgram();

    return tx;
  });
