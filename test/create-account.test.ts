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
import { Console, Effect } from "effect";

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

    const createAccountFlow = Effect.gen(function* (_) {
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
      yield* Effect.log(`TxHash: ${createAccountHash}`);

      yield* Effect.sync(() => emulator.awaitBlock(50));

      const [subscriberUtxos, serviceValidatorUtxos] = yield* Effect.all([
        Effect.promise(() => lucid.utxosAt(users.subscriber.address)),
        Effect.promise(() => lucid.utxosAt(accountAddress)),
      ]);

      yield* Console.log("Updated- Subscriber Utxos:", subscriberUtxos);
      yield* Console.log(
        "Updated- Account Validator Utxos:",
        serviceValidatorUtxos,
      );
      return createAccountHash;
    });

    const createAccountResult = yield* createAccountFlow.pipe(
      Effect.tapError((error) =>
        Effect.log(`Error initiating subscription: ${error}`)
      ),
      Effect.map((hash) => {
        console.log("Subscription initiated successfully. TxHash:", hash);
        return hash;
      }),
    );

    return createAccountResult;
  });
  await Effect.runPromise(program);
});
