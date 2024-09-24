import {
  Address,
  Assets,
  OutRef,
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
  user_token: Unit;
  ref_token: Unit;
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
  user_token: Unit;
  ref_token: Unit;
  scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
  };
};

export type RemoveAccountConfig = {
  email: string;
  phone: string;
  account_created: bigint;
  user_token: Unit;
  ref_token: Unit;
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
