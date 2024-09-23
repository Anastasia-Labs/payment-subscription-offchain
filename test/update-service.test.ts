import {
  createService,
  CreateServiceConfig,
  Emulator,
  generateEmulatorAccount,
  getServiceMultiValidator,
  Lucid,
  LucidEvolution,
  sendTokenToService,
  toUnit,
  updateService,
  UpdateServiceConfig,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import {
  Address,
  validatorToAddress,
} from "@lucid-evolution/lucid";
import { readServiceMultiValidator } from "./compiled/validators.js";
//   import stakingValidator from "./directOfferStaking.json" assert { type : "json" };

type LucidContext = {
  lucid: LucidEvolution;
  users: any;
  emulator: Emulator;
};

const refNft = toUnit(
  "cbe8007737fc6a3376cad95dfce70a2c947a0502569d6b9e4fbcf9e9",
  "000643b09e6291970cb44dd94008c79bcaf9d86f18b4b49ba5b2a04781db7199",
);

const userNft = toUnit(
  "cbe8007737fc6a3376cad95dfce70a2c947a0502569d6b9e4fbcf9e9",
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

  const serviceValidator = readServiceMultiValidator();

  //const validator = getServiceMultiValidator(lucid,config.script);
  
  const merchantAddr : Address = users.merchant.address;

  const serviceScript = {
    spending: serviceValidator.spendService.script,
    minting: serviceValidator.mintService.script,
    staking: "",
  };
  const valAddress = validatorToAddress("Custom",serviceValidator.spendService);
  
  const createServiceConfig: CreateServiceConfig = {
    service_fee: {
      policyId: "",
      assetName: "",
 },
    service_fee_qty: 10_000_000n,
    penalty_fee: {
      policyId: "",
      assetName: "",
 },
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

  const sendTokenUnsigned = await createService(
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
    console.log("Merchant utxos", await lucid.utxosAt(users.merchant.address));
    console.log("Validator utxos", await lucid.utxosAt(valAddress));

  }
  emulator.awaitBlock(100);

   console.log("UPDATING///////////////////////////>>>>");

  const updateServiceConfig: UpdateServiceConfig = {
    new_service_fee: {
                 policyId: "",
                 assetName: "",
            },
    new_service_fee_qty: 9_000_000n,
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
  };

   lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
   const updateServiceUnSigned = await updateService(lucid, updateServiceConfig);
  
   expect(updateServiceUnSigned.type).toBe("ok");
     if (updateServiceUnSigned.type == "ok") {
     const createServiceSigned = await updateServiceUnSigned.data.sign
       .withWallet()
       .complete();
    const createServiceHash = await createServiceSigned.submit();
   }
  emulator.awaitBlock(100);

  console.log("updatedMerchantUTxO: After:", await lucid.utxosAt(users.merchant.address));
  console.log("updated Validator Utxo: After:", await lucid.utxosAt(valAddress));
  });
