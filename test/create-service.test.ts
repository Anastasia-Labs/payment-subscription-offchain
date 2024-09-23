import {
  ADA,
  createService,
  CreateServiceConfig,
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
    merchant: await generateEmulatorAccount({
      lovelace: BigInt(100_000_000),
    }),
  };

  context.emulator = new Emulator([
    context.users.merchant,
  ]);

  context.lucid = await Lucid(context.emulator, "Custom");
});

test<LucidContext>("Test 1 - Create Service", async ({
  lucid,
  users,
  emulator,
}) => {
  console.log("createSubscriptionService...TEST!!!!");

  const serviceValidator = readMultiValidators();

  const serviceScript = {
    spending: serviceValidator.spendService.script,
    minting: serviceValidator.mintService.script,
    staking: "",
  };

  const createServiceConfig: CreateServiceConfig = {
    service_fee: ADA,
    service_fee_qty: 10_000_000n,
    penalty_fee: ADA,
    penalty_fee_qty: 1_000_000n,
    interval_length: 1n,
    num_intervals: 12n,
    minimum_ada: 2_000_000n,
    is_active: true,
    scripts: serviceScript,
  };

  lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

  try {
    const createServiceUnSigned = await Effect.runPromise(
      createService(lucid, createServiceConfig),
    );
    const createServiceSigned = await createServiceUnSigned.sign.withWallet()
      .complete();
    const createServiceHash = await createServiceSigned.submit();
    console.log("createServiceSigned: ", createServiceSigned.toJSON());
    console.log("TxHash: ", createServiceHash);
  } catch (error) {
    console.error("Error updating service:", error);
    throw error; // or handle it as appropriate for your test
  }
  emulator.awaitBlock(100);

  const serviceAddress = validatorToAddress(
    "Custom",
    serviceValidator.mintService,
  );

  const scriptUTxOs = await lucid.utxosAt(serviceAddress);
  console.log("Service Validator mint Address: ", serviceAddress);
  const merchantUTxO = await lucid.utxosAt(users.merchant.address);
  console.log("walletUTxO: ", merchantUTxO);
  console.log("Service Validator: ", scriptUTxOs);
  emulator.awaitBlock(100);
});
