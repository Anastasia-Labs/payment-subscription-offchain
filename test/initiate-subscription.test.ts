//Input 1 --> Subscriber utxo which has account NFT  - done // create account
//Input 2 --> service validator with refnft -- done  -- create service
//purpose -mintAssets(paymentNFT==> Payment validator policyid+tokenname)
//output1 --> subscriber utxo with account nft
//output2 --> payment NFt at the payment validator

import {
  ADA,
  applyParamsToScript,
  createAccount,
  CreateAccountConfig,
  createService,
  CreateServiceConfig,
  Emulator,
  generateEmulatorAccount,
  getValidatorDatum,
  initiateSubscription,
  Lucid,
  LucidEvolution,
  MintingPolicy,
  mintingPolicyToId,
  PaymentAccountConfig,
  SpendingValidator,
  toUnit,
  validatorToAddress,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { findCip68TokenNames } from "../src/core/utils/assets.js";

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
    merchant: await generateEmulatorAccount({
      lovelace: BigInt(100_000_000),
    }),
  };

  context.emulator = new Emulator([
    context.users.subscriber,
    context.users.merchant,
  ]);

  context.lucid = await Lucid(context.emulator, "Custom");
});

test<LucidContext>("Test 1 - Initiate subscription", async ({
  lucid,
  users,
  emulator,
}) => {
  console.log("createSubscriptionAccount...TEST!!!!");

  const accountValidator = readMultiValidators();

  const accountScript = {
    spending: accountValidator.spendAccount.script,
    minting: accountValidator.mintAccount.script,
    staking: "",
  };
  const accountPolicyId = mintingPolicyToId(accountValidator.mintAccount);

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

  const createAccountResult = await Effect.runPromise(
    createAccount(lucid, createAccountConfig),
  );
  const createAccountSigned = await createAccountResult.sign.withWallet()
    .complete();
  const createAccountHash = await createAccountSigned.submit();
  console.log("TxHash: ", createAccountHash);

  emulator.awaitBlock(100);

  const subscriberUTxO = await lucid.utxosAt(users.subscriber.address);
  console.log("Subscriber UTxO after creation of account:", subscriberUTxO);

  const accountScriptUTxOs = await lucid.utxosAt(accountAddress);

  console.log("Validator UTxOs after creation of account", accountScriptUTxOs);

  emulator.awaitBlock(100);

  console.log("createSubscriptionService...TEST!!!!");

  const serviceValidator = readMultiValidators();

  const servicePolicyId = mintingPolicyToId(serviceValidator.mintService);

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

  const createServiceUnSigned = await Effect.runPromise(
    createService(lucid, createServiceConfig),
  );
  const createServiceSigned = await createServiceUnSigned.sign.withWallet()
    .complete();
  const createServiceHash = await createServiceSigned.submit();

  emulator.awaitBlock(100);

  const serviceAddress = validatorToAddress(
    "Custom",
    serviceValidator.mintService,
  );

  const serviceScriptUTxOs = await lucid.utxosAt(serviceAddress);
  //console.log("Service Validator mint Address: ", serviceAddress);
  const merchantUTxO = await lucid.utxosAt(users.merchant.address);
  console.log("walletUTxO after create service: ", merchantUTxO);
  console.log("Validator utxos after create service: ", serviceScriptUTxOs);
  emulator.awaitBlock(100);

  const serviceValidatorUtxos = await getValidatorDatum(
    lucid,
    createServiceConfig,
  );

  console.log("Service Validator Utxos", serviceValidatorUtxos);
  const interval_length = serviceValidatorUtxos[0].interval_length;
  const num_intervals = serviceValidatorUtxos[0].num_intervals;
  const subscription_end = BigInt(emulator.now()) +
    interval_length * num_intervals;

  const paymentValidator = readMultiValidators();

  const paymentScript = {
    spending: paymentValidator.spendPayment.script,
    minting: paymentValidator.mintPayment.script,
    staking: "",
  };

  const mintingPolicy: MintingPolicy = {
    type: "PlutusV2",
    script: applyParamsToScript(
      paymentValidator.mintPayment.script,
      [servicePolicyId, accountPolicyId],
    ),
  };
  const paymentValidatorAddress = validatorToAddress("Custom", mintingPolicy);
  console.log("Payment validator address", paymentValidatorAddress);

  // Find the Account token names
  const { refTokenName: accRefName, userTokenName: accUserName } =
    findCip68TokenNames([
      ...accountScriptUTxOs,
      ...subscriberUTxO,
    ], accountPolicyId);

  const accRefNft = toUnit(
    accountPolicyId,
    accRefName,
  );

  const accUsrNft = toUnit(
    accountPolicyId,
    accUserName,
  );

  // Service NFTs
  const { refTokenName: serviceRefName, userTokenName: serviceUserName } =
    findCip68TokenNames([
      ...serviceScriptUTxOs,
      ...merchantUTxO,
    ], servicePolicyId);

  const servcRefNft = toUnit(
    servicePolicyId,
    serviceRefName,
  );

  const serviceUserNft = toUnit(
    servicePolicyId,
    serviceUserName,
  );

  const accountNFTUtxo = await lucid.utxosAtWithUnit(
    users.subscriber.address,
    accUsrNft,
  );
  const serviceNFTUtxo = await lucid.utxosAtWithUnit(
    serviceAddress,
    servcRefNft,
  );
  const paymentConfig: PaymentAccountConfig = {
    service_nft_tn: serviceRefName,
    account_nft_tn: accUserName,
    account_policyId: accountPolicyId,
    service_policyId: servicePolicyId,
    subscription_fee: ADA,
    total_subscription_fee: 120_000_000n,
    subscription_start: BigInt(emulator.now()),
    subscription_end: subscription_end,
    interval_length: interval_length, //30n * 24n * 60n * 60n * 1000n,
    interval_amount: 10_000_000n,
    num_intervals: num_intervals,
    last_claimed: 500000n,
    penalty_fee: ADA,
    penalty_fee_qty: 1_000_000n,
    minimum_ada: 1_000_000n,
    scripts: paymentScript,
    accountUtxo: accountNFTUtxo,
    serviceUtxo: serviceNFTUtxo,
    minting_Policy: mintingPolicy, //MintingPolicy
  };

  console.log("Payment config", paymentConfig);
  lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

  try {
    const initiateSubscriptionUnsigned = await initiateSubscription(
      lucid,
      paymentConfig,
    );
    expect(initiateSubscriptionUnsigned.type).toBe("ok");
    if (initiateSubscriptionUnsigned.type == "ok") {
      const initiateSubscriptionSigned = await initiateSubscriptionUnsigned.data
        .sign.withWallet()
        .complete();
      const initiateSubscriptionHash = await initiateSubscriptionSigned
        .submit();
      emulator.awaitBlock(50);
      console.log(
        "Payment Validator Utxos",
        await lucid.utxosAt(paymentValidatorAddress),
      );
      console.log(
        "Account- Subscriber Utxos ",
        await lucid.utxosAt(users.subscriber.address),
      );
      console.log(
        "Service- Validator Utxos ",
        await lucid.utxosAt(serviceAddress),
      );
    }
  } catch (error) {
    console.error("Error updating service:", error);
    throw error;
  }
});
