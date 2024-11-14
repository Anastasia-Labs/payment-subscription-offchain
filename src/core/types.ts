import {
  Address,
  Assets,
  OutRef,
  PolicyId,
  Script,
  TxSignBuilder,
  Unit,
  UTxO,
} from "@lucid-evolution/lucid";
import { AssetClassD, PaymentDatum, Value } from "./contract.types.js";

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
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
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
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
};

export type RemoveServiceConfig = {
  service_cs: PolicyId;
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
};

export type CreateAccountConfig = {
  email: string;
  phone: string;
  account_created: bigint;
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
};

export type UpdateAccountConfig = {
  // new_email: string;
  // new_phone: string;
  // account_created: bigint;
  account_policy_Id: string;
  account_ref_name: string;
  account_usr_name: string;
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
};

// TODO: Remove the tokens and replace with similar part of tokenname.
// TODO: Remove all datum fields and query from the UTxO
export type RemoveAccountConfig = {
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
};

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
  service_ref_token: Unit;
  account_user_token: Unit;
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
};

export type ExtendPaymentConfig = {
  payment_policy_Id: string;
  acc_user_token: Unit;
  subscriberUTxOs: UTxO[];
  serviceUTxO: UTxO[];
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
};

export type MerchantWithdrawConfig = {
  last_claimed: bigint;
  payment_policy_Id: string;
  merchant_token: Unit;
  service_ref_token: Unit;
  serviceUTxOs: UTxO[];
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
};

export type UnsubscribeConfig = {
  service_nft_tn: string; //AssetName,
  account_nft_tn: string;
  currentTime: bigint;
  user_token: Unit;
  ref_token: Unit;
  payment_policy_Id: string;
  payment_scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
};

export type WithdrawPenaltyConfig = {
  merchant_token: Unit;
  service_ref_token: Unit;
  merchantUTxOs: UTxO[];
  serviceUTxOs: UTxO[];
  payment_policy_Id: string;
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
};

export type SubscriberWithdrawConfig = {
  service_ref_name: string;
  subscriber_token: Unit;
  payment_policy_Id: string;
  serviceUTxOs: UTxO[];
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
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
  tknName: string;
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
  alwaysFails: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
  currentTime: BigInt;
};
