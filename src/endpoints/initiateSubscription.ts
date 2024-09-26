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
  TxSignBuilder,
  validatorToAddress,
} from "@lucid-evolution/lucid";
import { sha3_256 } from "@noble/hashes/sha3";
import { PaymentAccountConfig, Result } from "../core/types.js";
import {
  InitiatePayment,
  //MintPayment,
  PaymentDatum,
} from "../core/contract.types.js";
import { generateUniqueAssetName } from "../core/utils/assets.js";

export const initiateSubscription = async (
  lucid: LucidEvolution,
  config: PaymentAccountConfig,
): Promise<Result<TxSignBuilder>> => { // return type ,
  const subscriberAddr: Address = await lucid.wallet().address();

  const paymentAddress = validatorToAddress("Custom", config.minting_Policy);

  const paymentPolicyId = mintingPolicyToId(config.minting_Policy);
  console.log("Payment Policy Id: ", paymentPolicyId);

  const subscriberUTxOs = await lucid.utxosAt(subscriberAddr);

  if (!subscriberUTxOs || !subscriberUTxOs.length) {
    console.error("No UTxO found at user address: " + subscriberAddr);
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
  console.log("Payment validator address", paymentAddress);
  try {
    const tx = await lucid
      .newTx()
      .readFrom(config.serviceUtxo)
      //.collectFrom(subscriberUTxOs) // subscriber utxos
      .collectFrom(config.accountUtxo) // subscriber user nft utxo
      // service validator ref nft utxo
      .mintAssets({ [paymentNFT]: 1n }, redeemerData)
      .pay.ToAddress(subscriberAddr, accountAssets)
      .pay.ToAddressWithData(paymentAddress, {
        kind: "inline",
        value: directDatum,
      }, {
        lovelace: 12_000_000n,
        [paymentNFT]: 1n,
      })
      //.pay.ToAddress(subscriberAddr,{lovelace:2_000_000n})
      .attach.MintingPolicy(config.minting_Policy)
      //.attach.SpendingValidator(config.serviceValidator)
      .complete();

    return { type: "ok", data: tx };
  } catch (error) {
    console.log(error);
    if (error instanceof Error) return { type: "error", error: error };
    return { type: "error", error: new Error(`${JSON.stringify(error)}`) };
  }
};
