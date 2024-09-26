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
  const program = Effect.gen(function* () {
    console.log("createSubscriptionAccount...TEST!!!!");

    const accountValidator = readMultiValidators(false, []);

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
      const createAccountResult = yield* createAccount(
        lucid,
        createAccountConfig,
      );
      const createAccountSigned = yield* Effect.promise(() =>
        createAccountResult.sign.withWallet().complete()
      );
      const createAccountHash = yield* Effect.promise(() =>
        createAccountSigned.submit()
      );
      console.log("TxHash: ", createAccountHash);
    } catch (error) {
      console.error("Error updating Account:", error);
      throw error;
    }
    yield* Effect.sync(() => emulator.awaitBlock(100));

    const subscriberUTxO = yield* Effect.promise(() =>
      lucid.utxosAt(users.subscriber.address)
    );
    console.log("Updated Subscriber UTxO:", subscriberUTxO);

    const scriptUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(accountAddress)
    );
    console.log("Updated Account Validator: UTxOs", scriptUTxOs);
  });
  await Effect.runPromise(program);
});
