import {
  Address,
  Assets,
  OutRef,
  Script,
  TxSignBuilder,
  UTxO,
} from "@lucid-evolution/lucid";
import { AssetClassD } from "./contract.types.js";

export type CborHex = string;
export type RawHex = string;
export type POSIXTime = number;

export type Result<T> =
  | { type: "ok"; data: T }
  | { type: "error"; error: Error };

export type Either<L, R> =
  | { type: "left"; value: L }
  | { type: "right"; value: R };

export type ReadableUTxO<T> = {
  outRef: OutRef;
  datum: T;
  assets: Assets;
};

export type CreateServiceConfig = {
  service_fee: AssetClassD;
  service_fee_qty: bigint;
  penalty_fee: AssetClassD;
  penalty_fee_qty: bigint;
  interval_length: bigint;
  num_intervals: bigint;
  minimum_ada: bigint;
  is_active: boolean;
};

export type UpdateServiceConfig = {
  service_nft_tn: string; //AssetName,
  merchant_nft_tn: string;
  new_service_fee_qty: bigint;
  new_penalty_fee_qty: bigint;
  new_interval_length: bigint;
  new_num_intervals: bigint;
  new_minimum_ada: bigint;
};

export type RemoveServiceConfig = {
  service_nft_tn: string; //AssetName,
  merchant_nft_tn: string;
};

//TODO: Add account_updated field
export type CreateAccountConfig = {
  email: string;
  phone: string;
  account_created: bigint;
};

//TODO: Add account_updated field
export type UpdateAccountConfig = {
  new_email: string;
  new_phone: string;
  account_nft_tn: string;
  subscriber_nft_tn: string;
};

export type RemoveAccountConfig = {
  account_nft_tn: string;
  subscriber_nft_tn: string;
};

export type InitPaymentConfig = {
  service_nft_tn: string;
  subscriber_nft_tn: string;
  num_intervals: bigint;
  current_time: bigint;
};

export type ExtendPaymentConfig = {
  service_nft_tn: string;
  subscriber_nft_tn: string;
  extension_intervals: bigint;
};

export type MerchantWithdrawConfig = {
  service_nft_tn: string;
  merchant_nft_tn: string;
  payment_nft_tn: string;
  current_time: bigint;
};

export type UnsubscribeConfig = {
  service_nft_tn: string;
  subscriber_nft_tn: string;
  payment_nft_tn: string;
  current_time: bigint;
};

export type WithdrawPenaltyConfig = {
  service_nft_tn: string;
  merchant_nft_tn: string;
  payment_nft_tn: string;
};

export type SubscriberWithdrawConfig = {
  service_nft_tn: string;
  subscriber_nft_tn: string;
  service_utxos: UTxO[];
};

export type MultiValidator = {
  spendValidator: Script;
  spendValAddress: Address;
  mintValidator: Script;
  mintValAddress: Address;
};

export type Deploy = {
  tx: TxSignBuilder;
  deployPolicyId: string;
};

export type DeployRefScriptsConfig = {
  token_name: string;
  current_time: BigInt;
};
