import {
  AcceptOfferConfig,
  ADA,
  createAccount,
  CreateAccountConfig,
  Emulator,
  generateEmulatorAccount,
  Lucid,
  LucidEvolution,
  ServiceDatum,
  toUnit,
  validatorToAddress,
  validatorToRewardAddress,
  WithdrawalValidator,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import Script from "./compiled/plutus.json" assert { type: "json" };
import { MintingPolicy } from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { subscribe } from "diagnostics_channel";

//   import stakingValidator from "./directOfferStaking.json" assert { type : "json" };

type LucidContext = {
  lucid: LucidEvolution;
  users: any;
  emulator: Emulator;
};

// const token1 = toUnit(
//   "2c04fa26b36a376440b0615a7cdf1a0c2df061df89c8c055e2650505",
//   "63425441",
// );

// const token2 = toUnit(
//   "2c04fa26b36a376440b0615a7cdf1a0c2df061df89c8c055e2650505",
//   "63425442",
// );

// const token3 = toUnit(
//   "2c04fa26b36a376440b0615a7cdf1a0c2df061df89c8c055e2650505",
//   "63425443",
// );

// INITIALIZE EMULATOR + ACCOUNTS
beforeEach<LucidContext>(async (context) => {
  context.users = {
    merchant: await generateEmulatorAccount({
      lovelace: BigInt(100_000_000),
      // [token1]: BigInt(100),
    }),
    subscriber1: await generateEmulatorAccount({
      lovelace: BigInt(100_000_000),
    }),
    subscriber2: await generateEmulatorAccount({
      lovelace: BigInt(100_000_000),
      // [token2]: BigInt(1),
      // [token3]: BigInt(100),
    }),
  };

  context.emulator = new Emulator([
    context.users.merchant,
    context.users.subscriber1,
    context.users.subscriber2,
  ]);

  context.lucid = await Lucid(context.emulator, "Custom");
});

test<LucidContext>("Test 1 - Create Account", async ({
  lucid,
  users,
  emulator,
}) => {
  console.log("createSubscriptionAccount...TEST!!!!");

  const accountValidator = readMultiValidators();

  const accountScript = {
    spending: accountValidator.spendAccount.script,
    minting: accountValidator.mintAccount.script,
    staking: "",
  };

  const createAccountConfig: CreateAccountConfig = {
    email: "business@web3.ada",
    phone: "288-481-2686",
    account_created: BigInt(emulator.now()),
    scripts: accountScript,
  };

  lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
  const accountAddress = validatorToAddress(
    "Custom",
    accountValidator.spendAccount,
  );
  try {
    const createAccountResult = await Effect.runPromise(
      createAccount(lucid, createAccountConfig),
    );
    const createAccountSigned = await createAccountResult.sign.withWallet()
      .complete();
    const createAccountHash = await createAccountSigned.submit();
    console.log("TxHash: ", createAccountHash);
  } catch (error) {
    console.error("Error updating Account:", error);
    throw error; // or handle it as appropriate for your test
  }
  emulator.awaitBlock(100);

  const updatedMerchantUTxO = await lucid.utxosAt(users.merchant.address);
  console.log("updatedMerchantUTxO: After:", updatedMerchantUTxO);

  const scriptUTxOs = await lucid.utxosAt(accountAddress);

  console.log("Updated Account Validator: UTxOs", scriptUTxOs);

  emulator.awaitBlock(100);
});
