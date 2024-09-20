import {
  AcceptOfferConfig,
  ADA,
  createService,
  CreateServiceConfig,
  createServiceEffect,
  Emulator,
  generateEmulatorAccount,
  Lucid,
  LucidEvolution,
  ServiceDatum,
  toUnit,
  validatorToRewardAddress,
  WithdrawalValidator,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import Script from "./compiled/plutus.json" assert { type: "json" };
import { MintingPolicy } from "@lucid-evolution/lucid";
import { readServiceMultiValidator } from "./compiled/validators.js";
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
  // console.log("Create Subscription Service...TEST!!!!", createServiceConfig);

  lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

  const createServiceUnSigned = await createService(lucid, createServiceConfig);
  const scriptUTxOs = await lucid.utxosAt(serviceValidator.mintService.script);
  console.log("Service Validator: ", scriptUTxOs);
  expect(createServiceUnSigned.type).toBe("ok");
  if (createServiceUnSigned.type == "ok") {
    const createServiceSigned = await createServiceUnSigned.data.sign
      .withWallet()
      .complete();
    const createServiceHash = await createServiceSigned.submit();
    console.log("TxHash: ", createServiceHash);
  }
  const merchantUTxO = await lucid.utxosAt(users.merchant.address);
  console.log("walletUTxO: ", merchantUTxO);
  emulator.awaitBlock(100);

  // // Fetch Offer
  // const offerConfig: FetchOfferConfig = {
  //   scripts: offerScripts
  // };

  // const offers1 = await getOfferUTxOs(lucid, offerConfig);

  // console.log("Make Offer");
  // console.log("Available Offers", offers1);
  // console.log("utxos at merchant wallet", await lucid.utxosAt(users.merchant.address));

  // const acceptOfferConfig: AcceptOfferConfig = {
  //   offerOutRef: offers1[0].outRef,
  //   scripts: offerScripts
  // };

  // // Register Staking Validator's Reward Address
  // await registerRewardAddress(lucid);

  // // Accept Offer
  // lucid.selectWallet.fromSeed(users.subscriber1.seedPhrase);

  // const acceptOfferUnsigned1 = await acceptOffer(lucid, acceptOfferConfig);

  // expect(acceptOfferUnsigned1.type).toBe("ok");
  // if (acceptOfferUnsigned1.type == "ok"){
  //   const acceptOfferSigned1 = await acceptOfferUnsigned1.data
  //   .sign.withWallet()
  //   .complete();
  //   const acceptOfferSignedHash1 = await acceptOfferSigned1.submit();
  // }

  // emulator.awaitBlock(100);

  // const offers2 = await getOfferUTxOs(lucid, offerConfig);
  // console.log("Accept Offer");
  // console.log("Available Offers", JSON.stringify(offers2, replacer));
  // console.log("utxos at merchant wallet", await lucid.utxosAt(users.merchant.address));
  // console.log("utxos at subscriber1 wallet", await lucid.utxosAt(users.subscriber1.address));
  // console.log(
  //       "utxos at protocol wallet",
  //       await lucid.utxosAt(
  //         lucid.utils.credentialToAddress(
  //           lucid.utils.keyHashToCredential(PROTOCOL_PAYMENT_KEY),
  //           lucid.utils.keyHashToCredential(PROTOCOL_STAKE_KEY)
  //         )
  //       )
  //     );
});

// test<LucidContext>("Test 1 - Create Service Effect", async ({
//   lucid,
//   users,
//   emulator,
// }) => {
//   console.log("createSubscriptionService...TEST!!!!");

//   const serviceValidator = readServiceMultiValidator();

//   const serviceScript = {
//     spending: serviceValidator.spendService.script,
//     minting: serviceValidator.mintService.script,
//     staking: "",
//   };
//   // console.log("serviceScript...TEST!!!! ", serviceScript);
//   // console.log("createSubscriptionService...TEST!!!!");

//   const createServiceConfig: CreateServiceConfig = {
//     service_fee: ADA,
//     service_fee_qty: 10_000_000n,
//     penalty_fee: ADA,
//     penalty_fee_qty: 1_000_000n,
//     interval_length: 1n,
//     num_intervals: 12n,
//     minimum_ada: 2_000_000n,
//     is_active: true,
//     scripts: serviceScript,
//   };
//   console.log(
//     "Create Subscription Service EFFECT...TEST!!!!",
//     createServiceConfig,
//   );

//   lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

//   const createServiceUnSigned = Effect.runPromise(
//     await createServiceEffect(lucid, createServiceConfig),
//   );

//   // expect(createServiceUnSigned.type).toBe("ok");
//   // if (createServiceUnSigned.type == "ok") {
//   //   const createServiceSigned = await createServiceUnSigned.data.sign
//   //     .withWallet()
//   //     .complete();
//   //   const createServiceHash = await createServiceSigned.submit();
//   //   console.log("TxHash: ", createServiceHash);
//   // }

//   emulator.awaitBlock(100);
// });

//   test<LucidContext>("Test 2 - Make Offer, Accept Offer", async ({
//     lucid,
//     users,
//     emulator
//   }) => {
//     const offerScripts = {
//       spending: Script.cborHex,
//       staking: stakingValidator.cborHex
//     };

//     // Make Offer
//     const makeOfferConfig: MakeOfferConfig = {
//       offer: {
//         [token1]: BigInt(50)
//       },
//       toBuy: {
//         [token2]: BigInt(1),
//         [token3]: BigInt(33)
//       },
//       scripts: offerScripts,
//     };

//     lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

//     const makeOfferUnSigned = await makeOffer(lucid, makeOfferConfig);

//     expect(makeOfferUnSigned.type).toBe("ok");
//     if (makeOfferUnSigned.type == "ok") {
//       const makeOfferSigned = await makeOfferUnSigned.data.sign.withWallet().complete();
//       const makeOfferHash = await makeOfferSigned.submit();
//     }

//     emulator.awaitBlock(100);

//     // Fetch Offer
//     const offerConfig: FetchOfferConfig = {
//       scripts: offerScripts
//     };

//     const offers1 = await getOfferUTxOs(lucid, offerConfig);

//     // console.log("Make Offer");
//     // console.log("Available Offers", offers1);
//     // console.log("utxos at merchant wallet", await lucid.utxosAt(users.merchant.address));

//     const acceptOfferConfig: AcceptOfferConfig = {
//       offerOutRef: offers1[0].outRef,
//       scripts: offerScripts
//     };

//     // Register Staking Validator's Reward Address
//     await registerRewardAddress(lucid);

//     // Invalid Accept Offer
//     lucid.selectWallet.fromSeed(users.subscriber1.seedPhrase);

//     const acceptOfferUnsigned1 = await acceptOffer(lucid, acceptOfferConfig);

//     expect(acceptOfferUnsigned1.type).toBe("error");
//     if (acceptOfferUnsigned1.type == "error"){
//       // console.log("Invalid Accept Offer")
//       // console.log(`Failed. Response: ${acceptOfferUnsigned1.error}`)
//     }

//     emulator.awaitBlock(100);

//     // Valid Accept Offer
//     lucid.selectWallet.fromSeed(users.subscriber2.seedPhrase);

//     // fragment subscriber2 utxo to test manual coin selection
//     const subscriber2Addr = users.subscriber2.address;

//     const fragmentTx = await lucid
//       .newTx()
//       .pay.ToAddress(subscriber2Addr, {["lovelace"]: BigInt(10_000_000)})
//       .pay.ToAddress(subscriber2Addr, {[token3]: BigInt(10)})
//       .pay.ToAddress(subscriber2Addr, {[token2]: BigInt(1), [token3]: BigInt(5)})
//       .pay.ToAddress(subscriber2Addr, {["lovelace"]: BigInt(50_000_000)})
//       .pay.ToAddress(subscriber2Addr, {[token3]: BigInt(10), ["lovelace"]: BigInt(20_000_000)})
//       .pay.ToAddress(subscriber2Addr, {["lovelace"]: BigInt(5_000_000)})
//       .pay.ToAddress(subscriber2Addr, {[token3]: BigInt(10)})
//       .complete();
//     const fragmentTxSigned = await fragmentTx.sign.withWallet().complete();
//     await fragmentTxSigned.submit();

//     emulator.awaitBlock(100);

//     const acceptOfferUnsigned2 = await acceptOffer(lucid, acceptOfferConfig);
//     // console.log(acceptOfferUnsigned2);

//     expect(acceptOfferUnsigned2.type).toBe("ok");
//     if (acceptOfferUnsigned2.type == "ok"){
//       const acceptOfferSigned2 = await acceptOfferUnsigned2.data.sign.withWallet().complete();
//       const acceptOfferSignedHash2 = await acceptOfferSigned2.submit();
//     }

//     emulator.awaitBlock(100);

//     // const offers2 = await getOfferUTxOs(lucid, offerConfig);
//     // console.log("Valid Accept Offer");
//     // console.log("Available Offers", offers2);
//     // console.log("utxos at merchant wallet", await lucid.utxosAt(users.merchant.address));
//     // console.log("utxos at subscriber1 wallet", await lucid.utxosAt(users.subscriber1.address));
//     // console.log("utxos at subscriber2 wallet", await lucid.utxosAt(users.subscriber2.address));
//     // console.log(
//     //       "utxos at protocol wallet",
//     //       await lucid.utxosAt(
//     //         lucid.utils.credentialToAddress(
//     //           lucid.utils.keyHashToCredential(PROTOCOL_PAYMENT_KEY),
//     //           lucid.utils.keyHashToCredential(PROTOCOL_STAKE_KEY)
//     //         )
//     //       )
//     //   );
//   });
