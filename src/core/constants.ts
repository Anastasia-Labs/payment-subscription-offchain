export const ONE_HOUR_MS = 3_600_000;
export const ONE_YEAR_MS = 31_557_600_000;
export const TWO_YEARS_MS = 2 * ONE_YEAR_MS;
export const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS;
export const PROTOCOL_FEE = 0.05;
export const TIME_TOLERANCE_MS = process.env.NODE_ENV == "emulator"
    ? 0
    : 100_000;
export const PROTOCOL_PAYMENT_KEY =
    "014e9d57e1623f7eeef5d0a8d4e6734a562ba32cf910244cd74e1680";
export const PROTOCOL_STAKE_KEY =
    "5e8aa3f089868eaadf188426f49db6566624844b6c5d529b38f3b8a7";

export const ADA = {
    policyId: "",
    assetName: "",
};

export const REF_SCRIPT_TOKEN_NAMES = {
    spendService: "SpendService",
    mintService: "MintService",
    spendAccount: "SpendAccount",
    mintAccount: "MintAccount",
    spendPayment: "SpendPayment",
    mintPayment: "MintPayment",
};

export const PAYMENT_TOKEN_NAME = "subscription"
