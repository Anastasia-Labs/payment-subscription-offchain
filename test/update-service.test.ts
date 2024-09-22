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

  const serviceScript = {
    spending: serviceValidator.spendService.script,
    minting: serviceValidator.mintService.script,
    staking: "",
  };

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
