import {
  Address,
  Assets,
  Data,
  fromHex,
  LucidEvolution,
  mintingPolicyToId,
  RedeemerBuilder,
  selectUTxOs,
  toHex,
  toUnit,
  TransactionError,
  TxSignBuilder,
} from "@lucid-evolution/lucid";
import { sha3_256 } from "@noble/hashes/sha3";
import { getMultiValidator } from "../core/utils/index.js";
import {
  CreateServiceConfig,
  PaymentAccountConfig,
  Result,
} from "../core/types.js";
import {
  CreateServiceRedeemer,
  MintPayment,
  PaymentDatum,
  ServiceDatum,
} from "../core/contract.types.js";
import {
  createCip68TokenNames,
  generateUniqueAssetName,
} from "../core/utils/assets.js";
import { Effect } from "effect";
import { ADA } from "../core/constants.js";

export const initiateSubscription = async (
  lucid: LucidEvolution,
  config: PaymentAccountConfig,
): Promise<Result<TxSignBuilder>> => { // return type ,
  const subscriberAddr: Address = await lucid.wallet().address();

  const validators = getMultiValidator(lucid, config.scripts);
  //   const paymentPolicyId = mintingPolicyToId(validators1.mintValidator);
  const paymentPolicyId = mintingPolicyToId(validators.mintValidator);
  console.log("servicePolicyId: ", paymentPolicyId);

  const subscriberUTxOs = await lucid.utxosAt(subscriberAddr);

  if (!subscriberUTxOs || !subscriberUTxOs.length) {
    console.error("No UTxO found at user address: " + subscriberAddr);
  }

  // Selecting a utxo containing atleast 5 ADA to cover tx fees and min ADA
  // Note: To avoid tx balancing errors, the utxo should only contain lovelaces
  const selectedUTxOs = selectUTxOs(subscriberUTxOs, {
    ["lovelace"]: 5000000n,
  });

  const txHash = selectedUTxOs[0].txHash;
  const txHash256 = sha3_256(fromHex(txHash));

  const outputIndex = selectedUTxOs[0].outputIndex;

  //   console.log("TxHash", txHash);
  //   console.log("TxHash", outputIndex);

  const outputIndexByte = new Uint8Array([outputIndex]);
  //const tokenName = generateUniqueAssetName(selectedUTxOs[0],"");
  const tokenNameWithoutFunc = toHex(outputIndexByte) +
    toHex(txHash256.slice(0, 31));
  //console.log("Token name", tokenName);
  console.log("Token name without function", tokenNameWithoutFunc);

  const paymentredeemer: MintPayment = {
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

  const redeemerData = Data.to(paymentredeemer, MintPayment);
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

  console.log("Account UTxOs :: ", config.accountUtxo);
  console.log("Service UTxOs :: ", config.serviceUtxo);
  //console.log("subscriber UTxOs :: ", config.serviceUtxo);
  const paymentNFT = toUnit(
    paymentPolicyId,
    tokenNameWithoutFunc,
  );
  //const utxos = await subscriberAddr
  try {
    const tx = await lucid
      .newTx()
      .collectFrom(subscriberUTxOs) // subscriber utxos
      // .collectFrom(config.accountUtxo) // subscriber user nft utxo
      .readFrom(config.serviceUtxo) // service validator ref nft utxo
      .mintAssets({ [paymentNFT]: 1n }, redeemerData)
      .pay.ToContract(validators.mintValAddress, {
        kind: "inline",
        value: directDatum,
      }, {
        lovelace: 2_000_000n,
        [paymentNFT]: 1n,
      })
      .pay.ToAddress(subscriberAddr, {
        [config.account_nft_tn]: 1n,
      })
      .attach.MintingPolicy(validators.mintValidator)
      //.attach.SpendingValidator(validators1.spendService)
      .complete();

    return { type: "ok", data: tx };
  } catch (error) {
    console.log(error);
    if (error instanceof Error) return { type: "error", error: error };
    return { type: "error", error: new Error(`${JSON.stringify(error)}`) };
  }
};
