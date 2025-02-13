import {
  Address,
  Assets,
  OutRef,
  Script,
  TxSignBuilder,
  UTxO,
} from "@lucid-evolution/lucid";

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
  service_fee_policyid: string;
  service_fee_assetname: string;
  service_fee: bigint;
  penalty_fee_policyid: string;
  penalty_fee_assetname: string;
  penalty_fee: bigint;
  interval_length: bigint;
  num_intervals: bigint;
  is_active: boolean;
};

export type UpdateServiceConfig = {
  service_nft_tn: string; //AssetName,
  merchant_nft_tn: string;
  new_service_fee: bigint;
  new_penalty_fee: bigint;
  new_interval_length: bigint;
  new_num_intervals: bigint;
};

export type RemoveServiceConfig = {
  service_nft_tn: string; //AssetName,
  merchant_nft_tn: string;
};

//TODO: Add account_updated field
export type CreateAccountConfig = {
  email_hash: string;
  phone_hash: string;
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
  subscription_start: bigint;
};

export type ExtendPaymentConfig = {
  service_nft_tn: string;
  subscriber_nft_tn: string;
  extension_intervals: bigint;
};

export type MerchantWithdrawConfig = {
  service_nft_tn: string;
  subscriber_nft_tn: string,
  merchant_nft_tn: string;
  payment_nft_tn: string;
  current_time: bigint;
};

export type UnsubscribeConfig = {
  subscriber_nft_tn: string;
  current_time: bigint;
};

export type WithdrawPenaltyConfig = {
  service_nft_tn: string;
  merchant_nft_tn: string;
  subscriber_nft_tn: string;
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
