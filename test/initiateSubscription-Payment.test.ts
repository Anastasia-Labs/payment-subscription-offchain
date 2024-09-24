


//Input 1 --> Subscriber utxo which has account NFT  - done // create account
//Input 2 --> service validator with refnft -- done  -- create service
//purpose -mintAssets(paymentNFT==> Payment validator policyid+tokenname)
//output1 --> subscriber utxo with account nft
//output2 --> payment NFt at the payment validator 

import {
    ADA,
    createAccount,
    CreateAccountConfig,
    createService,
    CreateServiceConfig,
    Emulator,
    generateEmulatorAccount,
    Lucid,
    LucidEvolution,
    PaymentAccountConfig,
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
  

  test<LucidContext>("Test 1 - Initiate subscription for payment validator", async ({
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
  
    const scriptUTxOs = await lucid.utxosAt(accountAddress);
  
    console.log("Validator UTxOs after creation of account", scriptUTxOs);
  
    emulator.awaitBlock(100);

  
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
    console.log("Validator utxos after create service: ", scriptUTxOs);
    emulator.awaitBlock(100);

    const paymentConfig : PaymentAccountConfig ={
        service_nft_tn: string; //AssetName,
        account_nft_tn: string,
        subscription_fee: ADA,
        total_subscription_fee: 1_000_000_000n,
        subscription_start: bigint,
        subscription_end: bigint,
        interval_length: 30 * 24 * 60 * 60 * 1000,
        interval_amount: 100_000_000n,
        num_intervals: 10,
        last_claimed: bigint,
        penalty_fee: AssetClassD,
        penalty_fee_qty: bigint,
        minimum_ada: bigint,
        scripts: {
            spending: CborHex;
            minting: CborHex;
            staking: CborHex;
  
    }

  });
  