import {
  createService,
  CreateServiceConfig,
  Emulator,
  generateEmulatorAccount,
  Lucid,
  LucidEvolution,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import { readServiceMultiValidator } from "./compiled/validators.js";

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

//   async function createSubscriptionService(lucid: LucidEvolution): Promise<void> {
// const stakingVal : MintingPolicy = {
//   type: "PlutusV2",
//   script: Script.validators[0].compiledCode
// }

//     console.log("createSubscriptionService...")

//     const rewardAddress = validatorToRewardAddress("Custom", stakingVal);

//     const tx = await lucid
//       .newTx()
//       .registerStake(rewardAddress)
//       .complete();
//     const signedTx = await tx.sign.withWallet().complete();
//     await signedTx.submit();
//   }

test<LucidContext>("Test 1 - Create Service", async ({
  lucid,
  users,
  emulator,
}) => {
  console.log("createSubscriptionService...TEST!!!!");

  const serviceValidator = readServiceMultiValidator();

  const serviceScript = {
    spending: serviceValidator.spendService.script,
    minting: serviceValidator.mintService.script,
    staking: "",
  };
  // console.log("serviceScript...TEST!!!! ", serviceScript);
  // console.log("createSubscriptionService...TEST!!!!");

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
  // console.log("Create Subscription Service...TEST!!!!", createServiceConfig);

  lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

  const createServiceUnSigned = await createService(lucid, createServiceConfig);
  emulator.awaitBlock(50);
  //const scriptUTxOs = await lucid.utxosAt(serviceValidator.mintService.script);
  //console.log("Service Validator: ", scriptUTxOs);
  expect(createServiceUnSigned.type).toBe("ok");
  if (createServiceUnSigned.type == "ok") {
    const createServiceSigned = await createServiceUnSigned.data.sign
      .withWallet()
      .complete();
    const createServiceHash = await createServiceSigned.submit();
    //console.log("TxHash: ", createServiceHash);
  }
  const merchantUTxO = await lucid.utxosAt(users.merchant.address);
  console.log("Merchant Utxos: ", merchantUTxO);
  console.log("Vlidator utxos",await lucid.utxosAt(serviceValidator.spendService.script));
  emulator.awaitBlock(100);

});