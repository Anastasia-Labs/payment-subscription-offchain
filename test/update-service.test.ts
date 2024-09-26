import {
  ADA,
  createService,
  CreateServiceConfig,
  Emulator,
  generateEmulatorAccount,
  Lucid,
  LucidEvolution,
  updateService,
  UpdateServiceConfig,
} from "../src/index.js";
import { beforeEach, test } from "vitest";
import {
  mintingPolicyToId,
  toUnit,
  validatorToAddress,
} from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { findCip68TokenNames } from "../src/core/utils/assets.js";

type LucidContext = {
  lucid: LucidEvolution;
  users: any;
  emulator: Emulator;
};

const serviceValidator = readMultiValidators(false, []);
const servicePolicyId = mintingPolicyToId(serviceValidator.mintService);

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

test<LucidContext>("Test 1 - Update Service", async ({
  lucid,
  users,
  emulator,
}) => {
  console.log("Update Subscription Service...TEST!!!!");

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

  const merchantUTxO = await lucid.utxosAt(users.merchant.address);
  console.log("merchantAddress: ", users.merchant.address);
  console.log("merchantUTxOs before transaction: ", merchantUTxO);

  try {
    const createServiceUnSigned = await Effect.runPromise(
      createService(lucid, createServiceConfig),
    );
    const createServiceSigned = await createServiceUnSigned.sign.withWallet()
      .complete();
    const createServiceHash = await createServiceSigned.submit();
    console.log("TxHash: ", createServiceHash);
  } catch (error) {
    console.error("Error updating service:", error);
    throw error;
  }
  emulator.awaitBlock(100);
  const merchantUTxOs = await lucid.utxosAt(users.merchant.address);
  console.log("merchantAddress: After: ", users.merchant.address);
  console.log("merchantUTxO: After:", merchantUTxOs);

  const serviceScriptAddress = validatorToAddress(
    "Custom",
    serviceValidator.spendService,
  );
  console.log("Validator utxos", await lucid.utxosAt(serviceScriptAddress));
  const serviceUTxO = await lucid.utxosAt(serviceScriptAddress);

  emulator.awaitBlock(100);
  console.log(
    "UPDATING///////////////////////////>>>>>>>>>>>>>>>>>>",
    serviceUTxO,
  );

  // Find the token names
  const { refTokenName, userTokenName } = findCip68TokenNames([
    ...serviceUTxO,
    ...merchantUTxOs,
  ], servicePolicyId);

  const refNft = toUnit(
    servicePolicyId,
    refTokenName,
  );

  const userNft = toUnit(
    servicePolicyId,
    userTokenName,
  );

  const updateServiceConfig: UpdateServiceConfig = {
    new_service_fee: ADA,
    new_service_fee_qty: 9_500_000n,
    new_penalty_fee: ADA,
    new_penalty_fee_qty: 1_000_000n,
    new_interval_length: 1n,
    new_num_intervals: 12n,
    new_minimum_ada: 2_000_000n,
    is_active: true,
    user_token: userNft,
    ref_token: refNft,
    scripts: serviceScript,
  };

  lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

  try {
    const updateServiceResult = await Effect.runPromise(
      updateService(lucid, updateServiceConfig),
    );
    const updateServiceSigned = await updateServiceResult.sign.withWallet()
      .complete();
    const updateServiceHash = await updateServiceSigned.submit();
    console.log("TxHash: ", updateServiceHash);
  } catch (error) {
    console.error("Error updating service:", error);
    throw error; // or handle it as appropriate for your test
  }
  emulator.awaitBlock(100);

  const updatedMerchantUTxO = await lucid.utxosAt(users.merchant.address);
  console.log("updatedMerchantUTxO: After:", updatedMerchantUTxO);

  const scriptUTxOs = await lucid.utxosAt(serviceScriptAddress);

  console.log("Updated Service Validator: UTxOs", scriptUTxOs);

  emulator.awaitBlock(100);
});
