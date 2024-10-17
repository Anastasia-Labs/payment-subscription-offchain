import {
  Address,
  Assets,
  MintingPolicy,
  OutRef,
  PolicyId,
  Script,
  Unit,
  UTxO,
} from "@lucid-evolution/lucid";
import { AssetClassD, Value } from "./contract.types.js";

export type CborHex = string;
export type RawHex = string;
export type POSIXTime = number;

export type Result<T> =
  | { type: "ok"; data: T }
  | { type: "error"; error: Error };

export type Either<L, R> =
  | { type: "left"; value: L }
  | { type: "right"; value: R };

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
  service_cs: PolicyId;
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
};

// export type UpdateServiceDatumConfig = {
//   new_service_fee: AssetClassD;
//   new_service_fee_qty: bigint;
//   new_penalty_fee: AssetClassD;
//   new_penalty_fee_qty: bigint;
//   new_interval_length: bigint;
//   new_num_intervals: bigint;
//   new_minimum_ada: bigint;
//   is_active: boolean;
//   user_token: Unit;
//   ref_token: Unit;
//   scripts: {
//     spending: CborHex;
//     minting: CborHex;
//     staking: CborHex;
//   };
//   serviceUTxOs: UTxO[];
// };

export type RemoveServiceConfig = {
  service_fee: AssetClassD;
  service_fee_qty: bigint;
  penalty_fee: AssetClassD;
  penalty_fee_qty: bigint;
  interval_length: bigint;
  num_intervals: bigint;
  minimum_ada: bigint;
  is_active: boolean;
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
  new_email: string;
  new_phone: string;
  account_created: bigint;
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
};

// TODO: Remove the tokens and replace with similar part of tokenname.
// TODO: Remove all datum fields and query from the UTxO
export type RemoveAccountConfig = {
  // user_token: Unit;
  // ref_token: Unit;
  // subscriberUTxOs: UTxO[];
  // accountUTxOs: UTxO[];
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
};

export type InitPaymentConfig = {
  service_nft_tn: string; //AssetName,
  account_nft_tn: string;
  account_policyId: string;
  service_policyId: string;
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
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
  subscriberUTxO: UTxO[];
  serviceUTxO: UTxO[];
  service_user_token: Unit;
  service_ref_token: Unit;
  account_user_token: Unit;
  account_ref_token: Unit;
};

export type ExtendPaymentConfig = {
  service_nft_tn: string; //AssetName,
  account_nft_tn: string;
  account_policyId: string;
  service_policyId: string;
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
  user_token: Unit;
  service_ref_token: Unit;
  payment_token: Unit;
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
  subscriberUTxO: UTxO[];
  serviceUTxO: UTxO[];
  paymentUTxO: UTxO[];
};

export type MerchantWithdrawConfig = {
  service_nft_tn: string; //AssetName,
  account_nft_tn: string;
  account_policyId: string;
  service_policyId: string;
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
  merchant_token: Unit;
  service_ref_token: Unit;
  payment_token: Unit;
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
  merchantUTxO: UTxO[];
  serviceUTxO: UTxO[];
  paymentUTxO: UTxO[];
};

export type CreatePenaltyConfig = {
  service_nft_tn: string; //AssetName,
  account_nft_tn: string;
  penalty_fee: AssetClassD;
  penalty_fee_qty: bigint;
  subscriber_token: Unit;
  payment_token: Unit;
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
  subscriberUTxO: UTxO[];
  serviceUTxO: UTxO[];
  paymentUTxO: UTxO[];
};

export type WithdrawPenaltyConfig = {
  service_nft_tn: string; //AssetName,
  account_nft_tn: string;
  penalty_fee: AssetClassD;
  penalty_fee_qty: bigint;
  merchant_token: Unit;
  service_ref_token: Unit;
  payment_token: Unit;
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
  merchantUTxO: UTxO[];
  serviceUTxO: UTxO[];
  paymentUTxO: UTxO[];
};

export type SubscriberWithdrawConfig = {
  service_nft_tn: string; //AssetName,
  account_nft_tn: string;
  account_policyId: string;
  service_policyId: string;
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
  subscriber_token: Unit;
  service_ref_token: Unit;
  payment_token: Unit;
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
  subscriberUTxO: UTxO[];
  serviceUTxO: UTxO[];
  paymentUTxO: UTxO[];
  minting_Policy: MintingPolicy;
};

export type MultiValidator = {
  spendValidator: Script;
  spendValAddress: Address;
  mintValidator: Script;
  mintValAddress: Address;
};

export type CancelOfferConfig = {
  offerOutRef: OutRef;
  scripts: {
    spending: CborHex;
    staking: CborHex;
  };
};

export type AcceptOfferConfig = {
  offerOutRef: OutRef;
  scripts: {
    spending: CborHex;
    staking: CborHex;
  };
};

export type OfferValidators = {
  directOfferVal: Script;
  directOfferValAddress: Address;
  stakingVal: Script;
  rewardAddress: Address;
};

export type ReadableUTxO<T> = {
  outRef: OutRef;
  datum: T;
  assets: Assets;
};

export type OfferInfo = {
  creator: Address;
  toBuy: Value;
  offer: Value;
  offerUTxO: UTxO;
};
