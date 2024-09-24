import {
    ADA,
    createService,
    CreateServiceConfig,
    Emulator,
    generateEmulatorAccount,
    Lucid,
    LucidEvolution,
    RemoveServiceConfig,
    removeService,
    UpdateServiceConfig,
    getValidatorDatum,
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
  
  const serviceValidator = readMultiValidators();
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
  
  test<LucidContext>("Test 1 - Remove Service", async ({
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
  
    emulator.awaitBlock(50);
    // console.log(
    //   "UPDATING///////////////////////////>>>>>>>>>>>>>>>>>>",
    //   serviceUTxO,
    // );
  
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
    const validatorUtxos = await getValidatorDatum(lucid, createServiceConfig);

    const removeServiceConfig: RemoveServiceConfig = {
      service_fee: validatorUtxos[0].service_fee,
      service_fee_qty: validatorUtxos[0].service_fee_qty,
      penalty_fee: validatorUtxos[0].penalty_fee,
      penalty_fee_qty: validatorUtxos[0].penalty_fee_qty,
      interval_length: validatorUtxos[0].interval_length,
      num_intervals: validatorUtxos[0].num_intervals,
      minimum_ada: validatorUtxos[0].minimum_ada,
      is_active: false,
      user_token: userNft,
      ref_token: refNft,
      scripts: serviceScript,
    };
    console.log("Remove Service Config", removeServiceConfig);
  
     lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
  
    try {
      const updateServiceResult = await Effect.runPromise(removeService(lucid, removeServiceConfig),
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
    console.log("MerchantUTxO After remove service:", updatedMerchantUTxO);
  
    const scriptUTxOs = await lucid.utxosAt(serviceScriptAddress);
  
    console.log("Validator UTxOs after remove service", scriptUTxOs);
  
    emulator.awaitBlock(100);
  });
  