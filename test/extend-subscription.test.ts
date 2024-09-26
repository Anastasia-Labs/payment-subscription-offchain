import {
    ADA,
    createAccount,
    CreateAccountConfig,
    CreateServiceConfig,
    Emulator,
    ExtendPaymentConfig,
    extendSubscription,
    generateEmulatorAccount,
    getValidatorDatum,
    initiateSubscription,
    InitPaymentConfig,
    Lucid,
    LucidEvolution,
    removeAccount,
    RemoveAccountConfig,
    sendTokenToAccount,
    sendTokenToService,
    toUnit,
    UpdateAccountConfig,
    UpdateServiceConfig,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import { mintingPolicyToId, validatorToAddress } from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Console, Effect, pipe } from "effect";
import { toText } from "@lucid-evolution/lucid";
import { findCip68TokenNames } from "../src/core/utils/assets.js";
import { initiateSubscriptionTestCase } from "./initiate-subscription.test.js";

type LucidContext = {
    lucid: LucidEvolution;
    users: any;
    emulator: Emulator;
};

// INITIALIZE EMULATOR + ACCOUNTS
beforeEach<LucidContext>(async (context) => {
    context.users = {
        subscriber: generateEmulatorAccount({
            lovelace: BigInt(100_000_000),
        }),
        merchant: generateEmulatorAccount({
            lovelace: BigInt(100_000_000),
        }),
    };

    context.emulator = new Emulator([
        context.users.subscriber,
        context.users.merchant,
    ]);

    context.lucid = await Lucid(context.emulator, "Custom");
});

test<LucidContext>("Test 1 - Extend Service", async (
    context,
) => {
    const result = await Effect.runPromise(
        initiateSubscriptionTestCase(context),
    );
    expect(result).toBeDefined();
    expect(typeof result).toBe("string"); // Assuming the result is a transaction hash
    console.log(
        "Subscription initiated with transaction hash IN EXTEND:",
        result,
    );
});

// test<LucidContext>("Test 1 - Extend Service", async ({
//     lucid,
//     users,
//     emulator,
// }) => {
//     const program = Effect.gen(function* () {
//         yield* Effect.log("Extend Subscription Service...TEST!!!!");

//         const validators = readMultiValidators(false, []);
//         const accountPolicyId = mintingPolicyToId(validators.mintAccount);
//         const servicePolicyId = mintingPolicyToId(validators.mintService);
//         const serviceAddress = validatorToAddress(
//             "Custom",
//             validators.mintService,
//         );

//         const accountAddress = validatorToAddress(
//             "Custom",
//             validators.spendAccount,
//         );

//         const accountScriptUTxOs = yield* Effect.promise(() =>
//             lucid.utxosAt(accountAddress)
//         );

//         const subscriberUTxO = yield* Effect.promise(() =>
//             lucid.utxosAt(users.subscriber.address)
//         );

//         yield* Console.log("accountScriptUTxOs: ", accountScriptUTxOs);

//         // Find the Account token names
//         const { refTokenName: accRefName, userTokenName: accUserName } =
//             findCip68TokenNames([
//                 ...accountScriptUTxOs,
//                 ...subscriberUTxO,
//             ], accountPolicyId);

//         const accRefNft = toUnit(
//             accountPolicyId,
//             accRefName,
//         );

//         const accUsrNft = toUnit(
//             accountPolicyId,
//             accUserName,
//         );

//         const accountNFTUtxo = yield* Effect.promise(() =>
//             lucid.utxosAtWithUnit(
//                 users.subscriber.address,
//                 accUsrNft,
//             )
//         );

//         const accountScript = {
//             spending: validators.spendAccount.script,
//             minting: validators.mintAccount.script,
//             staking: "",
//         };

//         const serviceScript = {
//             spending: validators.spendService.script,
//             minting: validators.mintService.script,
//             staking: "",
//         };

//         const paymentScript = {
//             spending: validators.spendPayment.script,
//             minting: validators.mintPayment.script,
//             staking: "",
//         };

//         const createServiceConfig: CreateServiceConfig = {
//             service_fee: ADA,
//             service_fee_qty: 10_000_000n,
//             penalty_fee: ADA,
//             penalty_fee_qty: 1_000_000n,
//             interval_length: 1n,
//             num_intervals: 12n,
//             minimum_ada: 2_000_000n,
//             is_active: true,
//             scripts: serviceScript,
//         };

//         const serviceValidatorDatum = yield* Effect.promise(() =>
//             getValidatorDatum(
//                 lucid,
//                 createServiceConfig,
//             )
//         );
//         const merchantUTxO = yield* Effect.promise(() =>
//             lucid.utxosAt(users.merchant.address)
//         );

//         const serviceScriptUTxOs = yield* Effect.promise(() =>
//             lucid.utxosAt(serviceAddress)
//         );
//         yield* Console.log("serviceAddress: ", serviceAddress);
//         yield* Console.log("merchantUTxO: ", merchantUTxO);
//         yield* Console.log("serviceScriptUTxOs: ", serviceScriptUTxOs);
//         // yield* Console.log("paymentScriptUTxOs: ", paymentScriptUTxOs);

//         // Service NFTs
//         const { refTokenName: serviceRefName, userTokenName: serviceUserName } =
//             findCip68TokenNames([
//                 ...serviceScriptUTxOs,
//                 ...merchantUTxO,
//             ], servicePolicyId);

//         const servcRefNft = toUnit(
//             servicePolicyId,
//             serviceRefName,
//         );

//         const serviceUserNft = toUnit(
//             servicePolicyId,
//             serviceUserName,
//         );

//         const serviceNFTUtxo = yield* Effect.promise(() =>
//             lucid.utxosAtWithUnit(
//                 serviceAddress,
//                 servcRefNft,
//             )
//         );

//         yield* Effect.log("subscriberAddress: ", users.subscriber.address);
//         yield* Effect.log(
//             "subscriberUTxOs before transaction: ",
//             subscriberUTxO,
//         );

//         const interval_length = serviceValidatorDatum[0].interval_length;
//         const num_intervals = serviceValidatorDatum[0].num_intervals;
//         const subscription_end = BigInt(emulator.now()) +
//             interval_length * num_intervals;

//         const paymentServiceConfig: InitPaymentConfig = {
//             service_nft_tn: serviceRefName,
//             account_nft_tn: accUserName,
//             account_policyId: accountPolicyId,
//             service_policyId: servicePolicyId,
//             subscription_fee: ADA,
//             total_subscription_fee: 120_000_000n,
//             subscription_start: BigInt(emulator.now()),
//             subscription_end: subscription_end,
//             interval_length: interval_length, //30n * 24n * 60n * 60n * 1000n,
//             interval_amount: 10_000_000n,
//             num_intervals: num_intervals,
//             last_claimed: 500000n,
//             penalty_fee: ADA,
//             penalty_fee_qty: 1_000_000n,
//             minimum_ada: 1_000_000n,
//             scripts: paymentScript,
//             accountUtxo: accountNFTUtxo,
//             serviceUtxo: serviceNFTUtxo,
//             minting_Policy: validators.mintPayment, //MintingPolicy
//         };

//         lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

//         try {
//             const initSubscriptionUnSigned = yield* initiateSubscription(
//                 lucid,
//                 paymentServiceConfig,
//             );
//             const initiateSubscriptionSigned = yield* Effect.promise(() =>
//                 initSubscriptionUnSigned.sign.withWallet().complete()
//             );

//             const createAccountHash = yield* Effect.promise(() =>
//                 initiateSubscriptionSigned.submit()
//             );
//             yield* Effect.log("TxHash: ", createAccountHash);
//         } catch (error) {
//             console.error("Error updating service:", error);
//             throw error;
//         }

//         yield* Effect.sync(() => emulator.awaitBlock(100));

//         const subscriberUTxOAfter = yield* Effect.promise(() =>
//             lucid.utxosAt(users.subscriber.address)
//         );

//         yield* Effect.log(
//             "subscriberAddress: After: ",
//             users.subscriber.address,
//         );
//         yield* Effect.log("subscriberUTxO: After:", subscriberUTxOAfter);

//         const accountScriptAddress = validatorToAddress(
//             "Custom",
//             validators.spendAccount,
//         );
//         const accountUTxO = yield* Effect.promise(() =>
//             lucid.utxosAt(accountScriptAddress)
//         );

//         yield* Effect.log("Validator utxos", accountUTxO);

//         emulator.awaitBlock(100);
//         yield* Effect.log(
//             "REMOVING///////////////////////////>>>>>>>>>>>>>>>>>>",
//             accountUTxO,
//         );

//         // Find the token names
//         const { refTokenName, userTokenName } = findCip68TokenNames([
//             ...accountUTxO,
//             ...subscriberUTxOAfter,
//         ], accountPolicyId);

//         const refNft = toUnit(
//             accountPolicyId,
//             refTokenName,
//         );

//         const userNft = toUnit(
//             accountPolicyId,
//             userTokenName,
//         );

//         const extendPaymentConfig: ExtendPaymentConfig = {
//             service_nft_tn: serviceRefName,
//             account_nft_tn: accUserName,
//             account_policyId: accountPolicyId,
//             service_policyId: servicePolicyId,
//             subscription_fee: ADA,
//             total_subscription_fee: 120_000_000n,
//             subscription_start: BigInt(emulator.now()),
//             subscription_end: subscription_end,
//             interval_length: interval_length, //30n * 24n * 60n * 60n * 1000n,
//             interval_amount: 10_000_000n,
//             num_intervals: num_intervals,
//             last_claimed: 500000n,
//             penalty_fee: ADA,
//             penalty_fee_qty: 1_000_000n,
//             minimum_ada: 1_000_000n,
//             scripts: paymentScript,
//             accountUtxo: accountNFTUtxo,
//             serviceUtxo: serviceNFTUtxo,
//             minting_Policy: validators.mintPayment, //Mintin
//         };

//         lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

//         try {
//             const extendPaymentResult = yield* extendSubscription(
//                 lucid,
//                 extendPaymentConfig,
//             );
//             const extendPaymentSigned = yield* Effect.promise(() =>
//                 extendPaymentResult.sign
//                     .withWallet()
//                     .complete()
//             );
//             const removeAccountHash = yield* Effect.promise(() =>
//                 extendPaymentSigned.submit()
//             );
//             yield* Effect.log("TxHash: ", removeAccountHash);
//         } catch (error) {
//             console.error("Error updating service:", error);
//             throw error;
//         }
//         yield* Effect.sync(() => emulator.awaitBlock(100));

//         const removeSubscriberUTxO = yield* Effect.promise(() =>
//             lucid.utxosAt(users.subscriber.address)
//         );

//         yield* Effect.log("removeSubscriberUTxO: After:", removeSubscriberUTxO);

//         const scriptUTxOs = yield* Effect.promise(() =>
//             lucid.utxosAt(accountScriptAddress)
//         );

//         yield* Effect.log("Updated Service Validator: UTxOs", scriptUTxOs);
//     });
//     await Effect.runPromise(program);
// });
