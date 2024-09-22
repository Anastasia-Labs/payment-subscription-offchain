import {
  ADA,
  CreateServiceConfig,
  Emulator,
  generateEmulatorAccount,
  Lucid,
  LucidEvolution,
  sendTokenToService,
  toUnit,
  updateService,
  UpdateServiceConfig,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import { mintingPolicyToId, validatorToAddress } from "@lucid-evolution/lucid";
import { readServiceMultiValidator } from "./compiled/validators.js";

type LucidContext = {
  lucid: LucidEvolution;
  users: any;
  emulator: Emulator;
};

const serviceValidator = readServiceMultiValidator();
const servicePolicyId = mintingPolicyToId(serviceValidator.mintService);

const refNft = toUnit(
  servicePolicyId,
  "000643b09e6291970cb44dd94008c79bcaf9d86f18b4b49ba5b2a04781db7199",
);

const userNft = toUnit(
  servicePolicyId,
  "000de1409e6291970cb44dd94008c79bcaf9d86f18b4b49ba5b2a04781db7199",
);

// INITIALIZE EMULATOR + ACCOUNTS
beforeEach<LucidContext>(async (context) => {
  context.users = {
    merchant: await generateEmulatorAccount({
      lovelace: BigInt(100_000_000),
      [refNft]: BigInt(1),
      [userNft]: BigInt(1),
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

  const sendTokenUnsigned = await sendTokenToService(
    lucid,
    createServiceConfig,
  );

  expect(sendTokenUnsigned.type).toBe("ok");
  if (sendTokenUnsigned.type == "ok") {
    const sendTokenSigned = await sendTokenUnsigned.data.sign
      .withWallet()
      .complete();
    const sendTokenHash = await sendTokenSigned.submit();
    emulator.awaitBlock(100);
    //console.log("sendTokenSigned: ", sendTokenSigned.toJSON());

    //console.log("TxHash: ", sendTokenHash);
    console.log("Merchant utxos", await lucid.utxosAt(users.merchant.address));
    console.log("Validator utxos", await lucid.utxosAt(valAddress));
  }
  emulator.awaitBlock(100);

  const merchantUTxOAfter = await lucid.utxosAt(users.merchant.address);
  console.log("merchantAddress: After: ", users.merchant.address);
  console.log("merchantUTxO: After:", merchantUTxOAfter);

  //   const serviceScriptAddress = validatorToAddress(
  //     "Custom",
  //     serviceValidator.spendService,
  //   );
  const serviceUTxO = await lucid.utxosAt(valAddress);

  //   console.log("Validator: Address: ", serviceScriptAddress);
  //   console.log("Service Validator UTxO: AFTER>>>>", serviceUTxO);

  emulator.awaitBlock(100);
  console.log(
    "UPDATING///////////////////////////>>>>>>>>>>>>>>>>>>",
    serviceUTxO,
  );

  const updateServiceConfig: UpdateServiceConfig = {
    new_service_fee: {
      policyId: "",
      assetName: "",
    },
    new_service_fee_qty: 9_500_000n,
    new_penalty_fee: {
      policyId: "",
      assetName: "",
    },
    new_penalty_fee_qty: 1_000_000n,
    new_interval_length: 1n,
    new_num_intervals: 12n,
    new_minimum_ada: 2_000_000n,
    is_active: true,
    scripts: serviceScript,
    merchantAddr: merchantAddr,
  };

  lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
  const updateServiceUnSigned = await updateService(lucid, updateServiceConfig);
  expect(updateServiceUnSigned.type).toBe("ok");
  if (updateServiceUnSigned.type == "ok") {
    const createServiceSigned = await updateServiceUnSigned.data.sign
      .withWallet()
      .complete();
    const createServiceHash = await createServiceSigned.submit();
    console.log("TxHash: ", createServiceHash);
  }
  emulator.awaitBlock(100);

  const updatedMerchantUTxO = await lucid.utxosAt(users.merchant.address);
  console.log("updatedMerchantUTxO: After:", updatedMerchantUTxO);

  const scriptUTxOs = await lucid.utxosAt(serviceScriptAddress);

  console.log("Updated Service Validator: UTxOs", scriptUTxOs);

  emulator.awaitBlock(100);
});
