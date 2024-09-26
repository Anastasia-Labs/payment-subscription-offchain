import {
  Address,
  applyParamsToScript,
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
import { InitPaymentConfig, Result } from "../core/types.js";
import {
  InitiatePayment,
  //MintPayment,
  PaymentDatum,
} from "../core/contract.types.js";
import { generateUniqueAssetName } from "../core/utils/assets.js";
import { getMultiValidator } from "../core/index.js";
import { Effect } from "effect";

export const extendSubscription = (
  lucid: LucidEvolution,
  config: InitPaymentConfig,
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

    // Selecting a utxo containing atleast 5 ADA to cover tx fees and min ADA
    // Note: To avoid tx balancing errors, the utxo should only contain lovelaces
    const selectedUTxOs = selectUTxOs(subscriberUTxOs, {
      ["lovelace"]: 5000000n,
    });
    const tokenName = generateUniqueAssetName(selectedUTxOs[0], "");

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
    console.log("REdeemer", redeemerData);

    const currDatum: PaymentDatum = {
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

    const directDatum = Data.to<PaymentDatum>(currDatum, PaymentDatum);

    console.log("DAtum", directDatum);

    console.log("Account UTxOs :: ", config.accountUtxo);
    console.log("Service UTxOs :: ", config.serviceUtxo);

    const accountAssets = config.accountUtxo[0].assets;
    console.log("assets from Account utxs", accountAssets);

    const paymentNFT = toUnit(
      paymentPolicyId,
      tokenName, //tokenNameWithoutFunc,
    );
    console.log("Service Utxo", config.serviceUtxo);
    console.log("Payment validator address", config);

    const tx = yield* lucid
      .newTx()
      .readFrom(config.serviceUtxo)
      //.collectFrom(subscriberUTxOs) // subscriber utxos
      .collectFrom(config.accountUtxo) // subscriber user nft utxo
      // service validator ref nft utxo
      .mintAssets({ [paymentNFT]: 1n }, redeemerData)
      .pay.ToAddress(subscriberAddress, accountAssets)
      .pay.ToAddressWithData(validators.spendValAddress, {
        kind: "inline",
        value: directDatum,
      }, {
        lovelace: 12_000_000n,
        [paymentNFT]: 1n,
      })
      //.pay.ToAddress(subscriberAddr,{lovelace:2_000_000n})
      .attach.MintingPolicy(config.minting_Policy)
      //.attach.SpendingValidator(config.serviceValidator)
      .completeProgram();

    return tx;
  });