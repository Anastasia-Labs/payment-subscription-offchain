import {
  createAccount,
  CreateAccountConfig,
  Emulator,
  generateEmulatorAccount,
  Lucid,
  LucidEvolution,
  validatorToAddress,
} from "../src/index.js";
import { beforeEach, test } from "vitest";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";

type LucidContext = {
  lucid: LucidEvolution;
  users: any;
  emulator: Emulator;
};

// INITIALIZE EMULATOR + ACCOUNTS
beforeEach<LucidContext>(async (context) => {
  context.users = {
    subscriber: await generateEmulatorAccount({
      lovelace: BigInt(100_000_000),
    }),
  };

  context.emulator = new Emulator([
    context.users.subscriber,
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

  lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
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
    throw error;
  }
  emulator.awaitBlock(100);

  const subscriberUTxO = await lucid.utxosAt(users.subscriber.address);
  console.log("Updated Subscriber UTxO:", subscriberUTxO);

  const scriptUTxOs = await lucid.utxosAt(accountAddress);

  console.log("Updated Account Validator: UTxOs", scriptUTxOs);

  emulator.awaitBlock(100);
});
