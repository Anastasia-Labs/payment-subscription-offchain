import {
  Address,
  mintingPolicyToId,
  UTxO,
  validatorToAddress,
} from "@lucid-evolution/lucid";
import { LucidContext, makeLucidContext } from "./service/lucidContext";
import { Effect } from "effect";
import { createAccountTestCase } from "./createAccountTestCase";
import { createServiceTestCase } from "./createServiceTestCase";
import { readMultiValidators } from "./compiled/validators";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { findCip68TokenNames } from "../src/core/utils/assets";

export type SetupResult = {
  context: LucidContext;
  serviceRefName: string;
  serviceUserName: string;
  accRefName: string;
  accUserName: string;
  serviceUTxOs: UTxO[];
  accountUTxOs: UTxO[];
  merchantUTxOs: UTxO[];
  subscriberUTxOs: UTxO[];
  currentTime: bigint;
};

const serviceValidator = readMultiValidators(blueprint, false, []);
const servicePolicyId = mintingPolicyToId(serviceValidator.mintService);

const accountValidator = readMultiValidators(blueprint, false, []);
const accountPolicyId = mintingPolicyToId(accountValidator.mintAccount);

const paymentValidator = readMultiValidators(blueprint, true, [
  servicePolicyId,
  accountPolicyId,
]);
const paymentPolicyId = mintingPolicyToId(
  paymentValidator.mintPayment,
);

const paymentScript = {
  spending: paymentValidator.spendPayment.script,
  minting: paymentValidator.mintPayment.script,
  staking: "",
};

export const setupTest = (): Effect.Effect<SetupResult, Error, never> => {
  return Effect.gen(function* (_) {
    const { lucid, users, emulator } = yield* makeLucidContext("Preprod");
    const network = lucid.config().network;
    let currentTime: bigint;

    // If using emulator, perform necessary setup
    if (emulator && network === "Custom") {
      // Create account and service if they don't exist
      const accountResult = yield* createAccountTestCase({
        lucid,
        users,
        emulator,
      });
      const serviceResult = yield* createServiceTestCase({
        lucid,
        users,
        emulator,
      });

      yield* Effect.sync(() => emulator.awaitBlock(10));

      currentTime = BigInt(emulator.now());
    } else {
      currentTime = BigInt(Date.now());
    }

    const paymentAddress = validatorToAddress(
      network,
      paymentValidator.spendPayment,
    );

    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
    const merchantAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );
    const merchantUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(merchantAddress)
    );

    const serviceAddress = validatorToAddress(
      network,
      serviceValidator.spendService,
    );

    const serviceUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(serviceAddress)
    );

    console.log("setupTest[0]>>>: \n");
    console.log("merchantUTxOs[0][1]>>>: \n", merchantUTxOs);
    // Find CIP68 Token Names
    const { refTokenName: serviceRefName, userTokenName: serviceUserName } =
      findCip68TokenNames(
        [serviceUTxOs[0], merchantUTxOs[0]],
        servicePolicyId,
      );

    // const merchantUTxOs = yield* Effect.promise(() =>
    //   lucid.utxosAt(users.merchant.address)
    // );

    lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
    const subscriberAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const subscriberUTxOs = yield* Effect.promise(() =>
      lucid.config().provider.getUtxos(subscriberAddress)
    );

    // Get necessary addresses
    const accountAddress = validatorToAddress(
      network,
      accountValidator.spendAccount,
    );

    // Fetch UTxOs
    const accountUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(accountAddress)
    );

    console.log("setupTest[1]>>>: \n");
    console.log("subscriberUTxOs[1]>>>: \n", subscriberUTxOs);
    const { refTokenName: accRefName, userTokenName: accUserName } =
      findCip68TokenNames(
        [accountUTxOs[0], subscriberUTxOs[0]],
        accountPolicyId,
      );

    return {
      context: { lucid, users, emulator },
      serviceRefName,
      serviceUserName,
      accRefName,
      accUserName,
      serviceUTxOs,
      accountUTxOs,
      merchantUTxOs,
      subscriberUTxOs,
      currentTime,
    };
  });
};