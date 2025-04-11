import {
  Address,
  Assets,
  OutRef,
  Script,
  TxSignBuilder,
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
  selected_out_ref: OutRef;
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
  service_nft_tn: string;
  merchant_nft_tn: string;
  new_service_fee: bigint;
  new_penalty_fee: bigint;
  new_interval_length: bigint;
  new_num_intervals: bigint;
};

export type RemoveServiceConfig = {
  service_nft_tn: string;
  merchant_nft_tn: string;
};

export type CreateAccountConfig = {
  selected_out_ref: OutRef;
  email: string;
  phone: string;
};

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
  service_nft_tn: string;
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
  script: Script;
};
