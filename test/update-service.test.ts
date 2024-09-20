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
  sendTokenToService,
  ServiceDatum,
  toUnit,
  updateService,
  UpdateServiceConfig,
  validatorToRewardAddress,
  WithdrawalValidator,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import Script from "./compiled/plutus.json" assert { type: "json" };
import {
  MintingPolicy,
  SpendingValidator,
  Validator,
  validatorToAddress,
} from "@lucid-evolution/lucid";
import { readServiceMultiValidator } from "./compiled/validators.js";
import { Effect } from "effect";
import { subscribe } from "diagnostics_channel";
import { useState } from "react";
//   import stakingValidator from "./directOfferStaking.json" assert { type : "json" };

type LucidContext = {
  lucid: LucidEvolution;
  users: any;
  emulator: Emulator;
};

const refNft = toUnit(
  "0d7895b6e27a70a4175c822a1e792a2fdc59817f7f7773079044812f",
  "000643b09e6291970cb44dd94008c79bcaf9d86f18b4b49ba5b2a04781db7199",
);

const userNft = toUnit(
  "0d7895b6e27a70a4175c822a1e792a2fdc59817f7f7773079044812f",
  "000de1409e6291970cb44dd94008c79bcaf9d86f18b4b49ba5b2a04781db7199",
);

// const token3 = toUnit(
//   "2c04fa26b36a376440b0615a7cdf1a0c2df061df89c8c055e2650505",
//   "63425443",
// );

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

  const merchantUTxO = await lucid.utxosAt(users.merchant.address);
  console.log("merchantAddress: ", users.merchant.address);
  console.log("merchantUTxO: ", merchantUTxO);

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
    console.log("sendTokenSigned: ", sendTokenSigned.toJSON());

    console.log("TxHash: ", sendTokenHash);
  }
  emulator.awaitBlock(100);

  // lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
  const merchantUTxOAfter = await lucid.utxosAt(users.merchant.address);
  console.log("merchantAddress: After: ", users.merchant.address);
  console.log("merchantUTxO: After:", merchantUTxOAfter);

  const serviceScriptAddress = validatorToAddress(
    "Custom",
    serviceValidator.spendService,
  );
  const serviceUTxO = await lucid.utxosAt(serviceScriptAddress);

  console.log("Validator: Address: ", serviceScriptAddress);
  console.log("Service Validator UTxO: AFTER>>>>", serviceUTxO);

  emulator.awaitBlock(100);
  console.log("UPDATING///////////////////////////>>>>", serviceUTxO);

  const updateServiceConfig: UpdateServiceConfig = {
    new_service_fee: ADA,
    new_service_fee_qty: 9_000_000n,
    new_penalty_fee: ADA,
    new_penalty_fee_qty: 1_000_000n,
    new_interval_length: 1n,
    new_num_intervals: 12n,
    new_minimum_ada: 2_000_000n,
    is_active: true,
    scripts: serviceScript,
  };

  lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
  const updateServiceUnSigned = await updateService(lucid, updateServiceConfig);
  // expect(updateServiceUnSigned.type).toBe("ok");
  // if (updateServiceUnSigned.type == "ok") {
  //   const createServiceSigned = await updateServiceUnSigned.data.sign
  //     .withWallet()
  //     .complete();
  //   const createServiceHash = await createServiceSigned.submit();
  //   console.log("TxHash: ", createServiceHash);
  // }
  emulator.awaitBlock(100);

  const updatedMerchantUTxO = await lucid.utxosAt(users.merchant.address);
  console.log("merchantAddress: After: ", users.merchant.address);
  console.log("updatedMerchantUTxO: After:", updatedMerchantUTxO);

  const scriptUTxOs = await lucid.utxosAt(serviceScriptAddress);

  console.log("Updated Service Validator: UTxOs", scriptUTxOs);

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
