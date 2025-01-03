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
  new_service_fee: AssetClassD;
  new_service_fee_qty: bigint;
  new_penalty_fee: AssetClassD;
  new_penalty_fee_qty: bigint;
  new_interval_length: bigint;
  new_num_intervals: bigint;
  new_minimum_ada: bigint;
  is_active: boolean;
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

// TODO: Remove all datum fields and query from the UTxO
export type InitPaymentConfig = {
  service_nft_tn: string; //AssetName,
  account_nft_tn: string;
  subscription_fee: AssetClassD;
  total_subscription_fee: bigint;
  subscription_start: bigint;
  subscription_end: bigint;
  interval_length: bigint;
  interval_amount: bigint;
  num_intervals: bigint;
  last_claimed: bigint;
  penalty_fee: AssetClassD;
  penalty_fee_qty: bigint;
  minimum_ada: bigint;
};

export type ExtendPaymentConfig = {
  subscriber_nft_tn: string;
};

export type MerchantWithdrawConfig = {
  service_nft_tn: string;
  merchant_nft_tn: string;
  last_claimed: bigint;
};

export type UnsubscribeConfig = {
  service_nft_tn: string; //AssetName,
  subscriber_nft_tn: string;
  current_time: bigint;
};

export type WithdrawPenaltyConfig = {
  service_nft_tn: string;
  merchant_nft_tn: string;
  merchant_utxos: UTxO[];
  service_utxos: UTxO[];
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
